import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import nodemailer from "nodemailer";
import { setIntegration } from "../log";
import type { InboundMessage } from "./whatsapp";

const address = () => process.env.EMAIL_ADDRESS ?? "";

const automatedSender = /(no-?reply|do-?not-?reply|mailer-daemon|postmaster|notifications?@|payments-?noreply)/;

export async function fetchUnreadEmails(): Promise<InboundMessage[]> {
  const client = new ImapFlow({
    host: process.env.IMAP_HOST ?? "imap.gmail.com",
    port: Number(process.env.IMAP_PORT ?? 993),
    secure: true,
    auth: { user: address(), pass: process.env.EMAIL_APP_PASSWORD ?? "" },
    logger: false
  });

  client.on("error", () => {});

  try {
    await client.connect();
  } catch (error) {
    const err = error as { responseText?: string; response?: string; message?: string };
    const detail = err.responseText || err.response || err.message || "IMAP connection failed";
    await setIntegration("email", false, `Inbox login failed: ${detail}`);
    throw new Error(detail);
  }

  const out: InboundMessage[] = [];
  const lock = await client.getMailboxLock("INBOX");
  try {
    const uids = (await client.search({ seen: false })) || [];
    for (const uid of uids) {
      const message = await client.fetchOne(String(uid), { source: true }, { uid: true });
      if (!message || !message.source) continue;
      const parsed = await simpleParser(message.source);
      const from = parsed.from?.value?.[0];
      const text = (parsed.text ?? "").split(/\r?\nOn .+ wrote:/)[0].trim();
      const sender = from?.address?.toLowerCase() ?? "";
      const automated =
        automatedSender.test(sender) ||
        Boolean(parsed.headers.get("auto-submitted")) ||
        /bulk|junk|list/.test(String(parsed.headers.get("precedence") ?? ""));
      if (sender && sender !== address().toLowerCase() && !automated && text) {
        out.push({
          externalId: sender,
          name: from?.name || null,
          providerId: parsed.messageId ?? `uid-${uid}`,
          text,
          meta: { subject: parsed.subject ?? "Your inquiry", lastMessageId: parsed.messageId ?? null }
        });
      }
      await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
    }
  } finally {
    lock.release();
    await client.logout();
  }
  await setIntegration("email", true, null);
  return out;
}

export async function sendEmail(to: string, subject: string, text: string, inReplyTo?: string | null) {
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: true,
    auth: { user: address(), pass: process.env.EMAIL_APP_PASSWORD ?? "" }
  });
  try {
    await transport.sendMail({
      from: address(),
      to,
      subject: subject.startsWith("Re:") ? subject : `Re: ${subject}`,
      text,
      inReplyTo: inReplyTo ?? undefined,
      references: inReplyTo ?? undefined
    });
    await setIntegration("email", true, null);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "SMTP send failed";
    await setIntegration("email", false, detail);
    throw error;
  }
}
