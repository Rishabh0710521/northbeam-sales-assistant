import { NextRequest } from "next/server";
import { ingestInBackground } from "../../../../lib/inbound";
import { parseInstagram } from "../../../../lib/channels/instagram";
import { validSignature } from "../../../../lib/verify";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const verified =
    params.get("hub.mode") === "subscribe" && params.get("hub.verify_token") === process.env.INSTAGRAM_VERIFY_TOKEN;
  console.log(`instagram webhook verification ${verified ? "accepted" : "rejected"}`);
  if (verified) return new Response(params.get("hub.challenge") ?? "");
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const header = request.headers.get("x-hub-signature-256");
  const secrets = [process.env.INSTAGRAM_APP_SECRET, process.env.APP_SECRET_META];
  const valid = secrets.some((secret) => validSignature(raw, header, secret));
  console.log(`instagram webhook received: signature ${valid ? "valid" : "invalid"}, ${raw.length} bytes`);
  if (!valid) return new Response("Invalid signature", { status: 401 });

  let messages;
  try {
    messages = parseInstagram(JSON.parse(raw));
  } catch (error) {
    console.log(`instagram webhook payload could not be read: ${error instanceof Error ? error.message : "unknown"}`);
    return new Response("ok");
  }
  console.log(`instagram webhook carried ${messages.length} text message(s)`);
  ingestInBackground("instagram", messages);
  return new Response("ok");
}