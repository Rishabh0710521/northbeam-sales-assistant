import { query } from "./db";
import { logAction } from "./log";
import { sendWhatsApp } from "./channels/whatsapp";
import { sendInstagram } from "./channels/instagram";
import { sendEmail } from "./channels/email";

export async function deliver(conversation: any, text: string, author: "assistant" | "human") {
  try {
    if (conversation.channel === "whatsapp") await sendWhatsApp(conversation.external_id, text);
    else if (conversation.channel === "instagram") await sendInstagram(conversation.external_id, text);
    else
      await sendEmail(
        conversation.external_id,
        conversation.meta?.subject ?? "Your inquiry",
        text,
        conversation.meta?.lastMessageId
      );
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    await logAction(conversation.id, "send_failed", `Could not send on ${conversation.channel}: ${detail}`, false);
    return false;
  }
  await query("insert into messages (conversation_id, direction, author, body) values ($1, 'out', $2, $3)", [
    conversation.id,
    author,
    text
  ]);
  await logAction(conversation.id, author === "human" ? "human_reply" : "assistant_reply", text.slice(0, 160));
  return true;
}
