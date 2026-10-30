import { NextRequest } from "next/server";
import { ingestInBackground } from "../../../../lib/inbound";
import { parseInstagram } from "../../../../lib/channels/instagram";
import { validSignature } from "../../../../lib/verify";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  if (params.get("hub.mode") === "subscribe" && params.get("hub.verify_token") === process.env.INSTAGRAM_VERIFY_TOKEN) {
    return new Response(params.get("hub.challenge") ?? "");
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (!validSignature(raw, request.headers.get("x-hub-signature-256"), process.env.APP_SECRET_META)) {
    return new Response("Invalid signature", { status: 401 });
  }
  ingestInBackground("instagram", parseInstagram(JSON.parse(raw)));
  return new Response("ok");
}
