import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { generateSlots, isSlotFree, pickRep, qualify } from "../lib/policy";
import { eventIdFor } from "../lib/calendar";

describe("qualify", () => {
  it("asks for more when required fields are missing", () => {
    const result = qualify({ service: "forecasting" });
    expect(result.status).toBe("needs_info");
    expect(result.missing).toEqual(["company", "budgetUsd", "timeline"]);
  });

  it("rejects a budget below the minimum", () => {
    const result = qualify({ service: "forecasting", company: "Acme", budgetUsd: 2000, timeline: "Q1" });
    expect(result.status).toBe("not_qualified");
  });

  it("rejects a service we do not offer", () => {
    expect(qualify({ service: "other", budgetUsd: 50000 }).status).toBe("not_qualified");
  });

  it("qualifies a complete lead above the minimum", () => {
    const result = qualify({ service: "dashboarding", company: "Acme", budgetUsd: 12000, timeline: "next month" });
    expect(result.status).toBe("qualified");
    expect(result.evidence.every((e) => e.pass)).toBe(true);
  });
});

describe("routing", () => {
  it("sends a service to its owner", () => {
    expect(pickRep("dashboarding", {}).rep.id).toBe("asha");
    expect(pickRep("forecasting", { rohan: 9 }).rep.id).toBe("rohan");
  });
});

describe("slots", () => {
  const now = DateTime.fromISO("2026-11-02T08:00:00", { zone: "Asia/Kolkata" });

  it("respects notice and working hours", () => {
    const slots = generateSlots([], now);
    expect(slots[0]).toBe("2026-11-02T06:30:00.000Z");
    expect(slots[1]).toBe("2026-11-03T04:30:00.000Z");
  });

  it("skips busy periods", () => {
    const busy = [{ start: "2026-11-02T06:30:00.000Z", end: "2026-11-02T07:00:00.000Z" }];
    expect(generateSlots(busy, now)[0]).toBe("2026-11-02T07:00:00.000Z");
  });

  it("detects a newly occupied slot", () => {
    const busy = [{ start: "2026-11-02T06:00:00.000Z", end: "2026-11-02T07:00:00.000Z" }];
    expect(isSlotFree("2026-11-02T06:30:00.000Z", busy)).toBe(false);
    expect(isSlotFree("2026-11-02T07:00:00.000Z", busy)).toBe(true);
  });
});

describe("event ids", () => {
  it("is stable for the same conversation and slot", () => {
    const a = eventIdFor("c1", "2026-11-02T06:30:00.000Z");
    expect(a).toBe(eventIdFor("c1", "2026-11-02T06:30:00.000Z"));
    expect(a).toMatch(/^[0-9a-f]{40}$/);
    expect(a).not.toBe(eventIdFor("c1", "2026-11-02T07:00:00.000Z"));
  });
});
