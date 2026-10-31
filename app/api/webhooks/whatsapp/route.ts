import { NextRequest } from "next/server";
import { ingestInBackground } from "../../../../lib/inbound";
import { parseWhatsApp } from "../../../../lib/channels/whatsapp";
import { validSignature } from "../../../../lib/verify";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const verified =
    params.get("hub.mode") === "subscribe" && params.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN;
  console.log(`whatsapp webhook verification ${verified ? "accepted" : "rejected"}`);
  if (verified) return new Response(params.get("hub.challenge") ?? "");
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const valid = validSignature(raw, request.headers.get("x-hub-signature-256"), process.env.APP_SECRET_META);
  console.log(`whatsapp webhook received: signature ${valid ? "valid" : "invalid"}, ${raw.length} bytes`);
  if (!valid) return new Response("Invalid signature", { status: 401 });

  let messages;
  try {
    messages = parseWhatsApp(JSON.parse(raw));
  } catch (error) {
    console.log(`whatsapp webhook payload could not be read: ${error instanceof Error ? error.message : "unknown"}`);
    return new Response("ok");
  }
  console.log(`whatsapp webhook carried ${messages.length} text message(s)`);
  ingestInBackground("whatsapp", messages);
  return new Response("ok");
}
