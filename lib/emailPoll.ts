import { fetchUnreadEmails } from "./channels/email";
import { ingest } from "./inbound";
import { logAction } from "./log";

let running = false;

export async function pollEmail() {
  if (running) return 0;
  running = true;
  try {
    const messages = await fetchUnreadEmails();
    for (const message of messages) await ingest("email", message);
    return messages.length;
  } finally {
    running = false;
  }
}

export function startEmailPolling(everyMs: number) {
  setInterval(() => {
    pollEmail().catch((error) =>
      logAction(null, "email_poll_failed", error instanceof Error ? error.message : "unknown", false).catch(() => {})
    );
  }, everyMs);
}
