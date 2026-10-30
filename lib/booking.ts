import { DateTime } from "luxon";
import { query } from "./db";
import { logAction } from "./log";
import { CalendarError, eventIdFor, freeBusy, getEvent, insertEvent } from "./calendar";
import { config, isSlotFree, formatSlot } from "./policy";

export type BookingOutcome =
  | { status: "booked"; slot: string; link: string | null }
  | { status: "already_booked"; slot: string }
  | { status: "slot_taken" }
  | { status: "in_progress" }
  | { status: "uncertain" }
  | { status: "failed"; reason: string };

export function calendarIdFor(repId: string) {
  const rep = config.reps.find((r) => r.id === repId);
  return rep ? process.env[rep.calendarEnv] ?? "" : "";
}

export async function bookSlot(conversation: any, slotStart: string): Promise<BookingOutcome> {
  const conversationId: string = conversation.id;
  const offered: string[] = conversation.offered_slots;
  if (!offered.includes(slotStart)) return { status: "failed", reason: "Slot was never offered" };

  const repId: string = conversation.assigned_rep;
  const calendarId = calendarIdFor(repId);
  if (!calendarId) return { status: "failed", reason: `No calendar configured for ${repId}` };

  const slotEnd = DateTime.fromISO(slotStart).plus({ minutes: config.slotMinutes }).toUTC().toISO()!;
  const eventId = eventIdFor(conversationId, slotStart);

  const claimed = await query(
    `insert into bookings (conversation_id, rep_id, slot_start, slot_end, event_id, status)
     values ($1, $2, $3, $4, $5, 'pending')
     on conflict (conversation_id) do update
       set rep_id = $2, slot_start = $3, slot_end = $4, event_id = $5, status = 'pending', detail = null, updated_at = now()
       where bookings.status = 'failed'
     returning id`,
    [conversationId, repId, slotStart, slotEnd, eventId]
  );

  if (claimed.length === 0) {
    const [existing] = await query("select * from bookings where conversation_id = $1", [conversationId]);
    if (existing.status === "confirmed") {
      await logAction(conversationId, "booking_duplicate_blocked", `Repeat confirmation ignored. Meeting already booked for ${formatSlot(existing.slot_start.toISOString())}`);
      return { status: "already_booked", slot: existing.slot_start.toISOString() };
    }
    if (existing.status === "uncertain") {
      await logAction(conversationId, "booking_not_retried", "Earlier booking attempt is uncertain. Not retrying automatically.", false);
      return { status: "uncertain" };
    }
    return { status: "in_progress" };
  }

  const setStatus = (status: string, detail: string | null, link: string | null = null) =>
    query(
      "update bookings set status = $2, detail = $3, event_link = coalesce($4, event_link), updated_at = now() where conversation_id = $1",
      [conversationId, status, detail, link]
    );

  try {
    const from = DateTime.fromISO(slotStart).minus({ minutes: 1 }).toUTC().toISO()!;
    const busy = await freeBusy(calendarId, from, slotEnd);
    if (!isSlotFree(slotStart, busy)) {
      await setStatus("failed", "Slot became busy before booking");
      await logAction(conversationId, "booking_slot_taken", `Recheck found ${formatSlot(slotStart)} occupied. No event created.`, false);
      return { status: "slot_taken" };
    }

    const result = await insertEvent(calendarId, {
      id: eventId,
      summary: `Intro call: ${conversation.collected.company ?? conversation.sender_name ?? "New lead"}`,
      description: `Channel: ${conversation.channel}\nService: ${conversation.collected.service ?? "unknown"}\nBooked by the sales assistant.`,
      start: slotStart,
      end: slotEnd,
      timeZone: config.timezone
    });
    await setStatus("confirmed", result.duplicate ? "Event already existed" : null, result.link);
    await logAction(conversationId, "booking_confirmed", `Calendar event created for ${formatSlot(slotStart)} with ${repId}`);
    return { status: "booked", slot: slotStart, link: result.link };
  } catch (error) {
    if (error instanceof CalendarError && error.kind === "uncertain") {
      let found = null;
      try {
        found = await getEvent(calendarId, eventId);
      } catch {
        found = null;
      }
      if (found) {
        await setStatus("confirmed", "Confirmed by lookup after a timeout", found.htmlLink ?? null);
        await logAction(conversationId, "booking_confirmed", `Event found after an uncertain response for ${formatSlot(slotStart)}`);
        return { status: "booked", slot: slotStart, link: found.htmlLink ?? null };
      }
      await setStatus("uncertain", error.message);
      await logAction(conversationId, "booking_uncertain", `${error.message}. Event not found on lookup. Not retrying; needs a person to check the calendar.`, false);
      return { status: "uncertain" };
    }
    const message = error instanceof Error ? error.message : "Unknown calendar error";
    await setStatus("failed", message);
    await logAction(conversationId, "booking_failed", message, false);
    return { status: "failed", reason: message };
  }
}
