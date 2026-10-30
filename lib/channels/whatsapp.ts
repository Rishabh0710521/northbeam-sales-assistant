import { metaPost } from "./meta";

export type InboundMessage = {
  externalId: string;
  name: string | null;
  providerId: string;
  text: string;
  meta?: Record<string, unknown>;
};

export function parseWhatsApp(payload: any): InboundMessage[] {
  const out: InboundMessage[] = [];
  for (const entry of payload?.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      for (const message of value.messages ?? []) {
        if (message.type !== "text" || !message.text?.body) continue;
        const contact = (value.contacts ?? []).find((c: any) => c.wa_id === message.from);
        out.push({
          externalId: message.from,
          name: contact?.profile?.name ?? null,
          providerId: message.id,
          text: message.text.body
        });
      }
    }
  }
  return out;
}

export async function sendWhatsApp(to: string, text: string) {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  await metaPost("whatsapp", `https://graph.facebook.com/v21.0/${phoneId}/messages`, process.env.WHATSAPP_ACCESS_TOKEN, {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text }
  });
}
