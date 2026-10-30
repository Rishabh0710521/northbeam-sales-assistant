import { DateTime } from "luxon";
import policy from "../policy.json";

export type Collected = {
  service?: string;
  company?: string;
  budgetUsd?: number;
  timeline?: string;
};

export type Evidence = { rule: string; value: string; pass: boolean };
export type Busy = { start: string; end: string };
export type Rep = (typeof policy.reps)[number];

export const config = policy;

export function qualify(collected: Collected) {
  const evidence: Evidence[] = [];
  const minBudget = policy.qualifying.minBudgetUsd;
  let blocked = false;

  if (collected.service) {
    const offered = policy.services.some((s) => s.id === collected.service);
    evidence.push({ rule: "Service is one we offer", value: collected.service, pass: offered });
    if (!offered) blocked = true;
  }
  if (collected.budgetUsd !== undefined && collected.budgetUsd !== null) {
    const enough = collected.budgetUsd >= minBudget;
    evidence.push({
      rule: `Budget is at least $${minBudget}`,
      value: `$${collected.budgetUsd}`,
      pass: enough
    });
    if (!enough) blocked = true;
  }
  if (collected.company) evidence.push({ rule: "Company named", value: collected.company, pass: true });
  if (collected.timeline) evidence.push({ rule: "Timeline given", value: collected.timeline, pass: true });

  const missing = (policy.qualifying.requiredFields as string[]).filter((field) => {
    const value = (collected as Record<string, unknown>)[field];
    return value === undefined || value === null || value === "";
  });

  if (!blocked) {
    for (const field of missing) evidence.push({ rule: `${field} provided`, value: "missing", pass: false });
  }

  const status = blocked ? "not_qualified" : missing.length ? "needs_info" : "qualified";
  return { status, evidence, missing: blocked ? [] : missing };
}

export function declineReason(collected: Collected) {
  const service = collected.service;
  if (service && !policy.services.some((s) => s.id === service)) {
    return `The service they asked about is not one we offer. We offer: ${policy.services.map((s) => s.name).join(", ")}.`;
  }
  return `Our engagements start at a budget of $${policy.qualifying.minBudgetUsd}, and their budget is below that.`;
}

export function pickRep(service: string, openLeads: Record<string, number>) {
  const owners = policy.reps.filter((rep) => rep.services.includes(service));
  if (owners.length === 1) {
    return { rep: owners[0], rule: `${owners[0].name} owns the ${service} service` };
  }
  const pool = owners.length > 0 ? owners : policy.reps;
  const sorted = [...pool].sort(
    (a, b) => (openLeads[a.id] ?? 0) - (openLeads[b.id] ?? 0) || a.id.localeCompare(b.id)
  );
  return { rep: sorted[0], rule: `Fewest open leads among ${pool.map((r) => r.name).join(" and ")}` };
}

function overlaps(start: DateTime, end: DateTime, busy: Busy[]) {
  return busy.some((b) => DateTime.fromISO(b.start) < end && DateTime.fromISO(b.end) > start);
}

export function isSlotFree(slotStart: string, busy: Busy[]) {
  const start = DateTime.fromISO(slotStart);
  return !overlaps(start, start.plus({ minutes: policy.slotMinutes }), busy);
}

export function generateSlots(busy: Busy[], now: DateTime = DateTime.now()) {
  const zone = policy.timezone;
  const [startHour, startMinute] = policy.workingHours.start.split(":").map(Number);
  const [endHour, endMinute] = policy.workingHours.end.split(":").map(Number);
  const earliest = now.plus({ hours: policy.minNoticeHours });
  const picks: string[] = [];

  for (let offset = 0; offset <= policy.horizonDays && picks.length < policy.maxOffered; offset++) {
    const day = now.setZone(zone).startOf("day").plus({ days: offset });
    if (!policy.workingHours.days.includes(day.weekday)) continue;
    const closing = day.set({ hour: endHour, minute: endMinute });
    let cursor = day.set({ hour: startHour, minute: startMinute });
    while (cursor.plus({ minutes: policy.slotMinutes }) <= closing) {
      const slotEnd = cursor.plus({ minutes: policy.slotMinutes });
      if (cursor >= earliest && !overlaps(cursor, slotEnd, busy)) {
        picks.push(cursor.toUTC().toISO()!);
        break;
      }
      cursor = slotEnd;
    }
  }
  return picks;
}

export function formatSlot(iso: string) {
  return DateTime.fromISO(iso).setZone(policy.timezone).toFormat("ccc d LLL, h:mm a ZZZZ");
}

export function slotWindow() {
  const now = DateTime.now();
  return {
    from: now.toUTC().toISO()!,
    to: now.plus({ days: policy.horizonDays + 1 }).toUTC().toISO()!
  };
}
