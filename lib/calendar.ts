import { createHash } from "node:crypto";
import { setIntegration } from "./log";
import type { Busy } from "./policy";

export type CalendarFailure = "auth" | "api" | "uncertain";

export class CalendarError extends Error {
  kind: CalendarFailure;
  constructor(kind: CalendarFailure, message: string) {
    super(message);
    this.kind = kind;
  }
}

let cached: { token: string; expiresAt: number } | null = null;

async function accessToken() {
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.token;
  let response: Response;
  try {
    response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN ?? "",
        grant_type: "refresh_token"
      }),
      signal: AbortSignal.timeout(8000)
    });
  } catch {
    throw new CalendarError("api", "Could not reach Google to refresh the calendar connection");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = `Google calendar connection expired or was revoked (${data.error ?? response.status}). Reconnect it and update GOOGLE_REFRESH_TOKEN.`;
    await setIntegration("calendar", false, detail);
    throw new CalendarError("auth", detail);
  }
  cached = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cached.token;
}

async function call(path: string, init: RequestInit = {}, writes = false) {
  const token = await accessToken();
  let response: Response;
  try {
    response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(8000)
    });
  } catch {
    throw new CalendarError(writes ? "uncertain" : "api", "No response from Google Calendar");
  }
  if (response.status === 401) {
    cached = null;
    const detail = "Google rejected the calendar token. Reconnect the calendar.";
    await setIntegration("calendar", false, detail);
    throw new CalendarError("auth", detail);
  }
  if (response.status >= 500) {
    throw new CalendarError(writes ? "uncertain" : "api", `Google Calendar returned ${response.status}`);
  }
  await setIntegration("calendar", true, null);
  return response;
}

export async function freeBusy(calendarId: string, from: string, to: string): Promise<Busy[]> {
  const response = await call("/freeBusy", {
    method: "POST",
    body: JSON.stringify({ timeMin: from, timeMax: to, items: [{ id: calendarId }] })
  });
  const data = await response.json();
  if (!response.ok) throw new CalendarError("api", `Free/busy lookup failed: ${data.error?.message ?? response.status}`);
  return (data.calendars?.[calendarId]?.busy ?? []) as Busy[];
}

export function eventIdFor(conversationId: string, slotStart: string) {
  return createHash("sha1").update(`${conversationId}|${slotStart}`).digest("hex");
}

export async function getEvent(calendarId: string, eventId: string) {
  const response = await call(`/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new CalendarError("api", `Event lookup failed with ${response.status}`);
  return (await response.json()) as { id: string; htmlLink?: string; status?: string };
}

export async function insertEvent(
  calendarId: string,
  event: { id: string; summary: string; description: string; start: string; end: string; timeZone: string }
) {
  const response = await call(
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      body: JSON.stringify({
        id: event.id,
        summary: event.summary,
        description: event.description,
        start: { dateTime: event.start, timeZone: event.timeZone },
        end: { dateTime: event.end, timeZone: event.timeZone }
      })
    },
    true
  );
  if (response.status === 409) {
    const existing = await getEvent(calendarId, event.id);
    return { link: existing?.htmlLink ?? null, duplicate: true };
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new CalendarError("api", `Event creation failed: ${data.error?.message ?? response.status}`);
  return { link: (data.htmlLink as string) ?? null, duplicate: false };
}
