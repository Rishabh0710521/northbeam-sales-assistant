import { query } from "./db";
import { logAction } from "./log";
import { handleConversation } from "./handle";
import type { InboundMessage } from "./channels/whatsapp";

export async function ingest(channel: "whatsapp" | "instagram" | "email", message: InboundMessage) {
  const [conversation] = await query(
    `insert into conversations (channel, external_id, sender_name, meta)
     values ($1, $2, $3, $4::jsonb)
     on conflict (channel, external_id) do update
       set sender_name = coalesce(conversations.sender_name, excluded.sender_name),
           meta = conversations.meta || excluded.meta,
           updated_at = now()
     returning id`,
    [channel, message.externalId, message.name, JSON.stringify(message.meta ?? {})]
  );
  const inserted = await query(
    `insert into messages (conversation_id, direction, author, body, provider_id)
     values ($1, 'in', 'lead', $2, $3)
     on conflict (conversation_id, provider_id) do nothing
     returning id`,
    [conversation.id, message.text, message.providerId]
  );
  if (inserted.length === 0) return;
  await logAction(conversation.id, "message_received", `${channel} message from ${message.name ?? message.externalId}`);
  await handleConversation(conversation.id);
}

export function ingestInBackground(channel: "whatsapp" | "instagram" | "email", messages: InboundMessage[]) {
  void (async () => {
    for (const message of messages) {
      try {
        await ingest(channel, message);
      } catch (error) {
        await logAction(null, "ingest_failed", `${channel}: ${error instanceof Error ? error.message : "unknown"}`, false).catch(() => {});
      }
    }
  })();
}
