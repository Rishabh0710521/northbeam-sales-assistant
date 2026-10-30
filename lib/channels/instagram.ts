import { metaPost } from "./meta";
import type { InboundMessage } from "./whatsapp";

export function parseInstagram(payload: any): InboundMessage[] {
  const out: InboundMessage[] = [];
  if (payload?.object !== "instagram") return out;
  for (const entry of payload.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      const message = event.message;
      if (!message || message.is_echo || !message.text) continue;
      out.push({
        externalId: event.sender.id,
        name: null,
        providerId: message.mid,
        text: message.text
      });
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
