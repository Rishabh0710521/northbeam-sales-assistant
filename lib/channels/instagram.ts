import { metaPost } from "./meta";
import type { InboundMessage } from "./whatsapp";

function toMessage(sender: any, message: any): InboundMessage | null {
  if (!sender?.id || !message || message.is_echo || !message.text) return null;
  return {
    externalId: String(sender.id),
    name: null,
    providerId: String(message.mid ?? `${sender.id}-${Date.now()}`),
    text: message.text
  };
}

export function parseInstagram(payload: any): InboundMessage[] {
  const out: InboundMessage[] = [];
  for (const entry of payload?.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      const message = toMessage(event.sender, event.message);
      if (message) out.push(message);
    }
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;
      const value = change.value ?? {};
      const message = toMessage(value.sender, value.message);
      if (message) out.push(message);
    }
  }
  return out;
}

export async function sendInstagram(recipientId: string, text: string) {
  await metaPost("instagram", "https://graph.instagram.com/v21.0/me/messages", process.env.INSTAGRAM_ACCESS_TOKEN, {
    recipient: { id: recipientId },
    message: { text }
  });
}