import { query } from "../../../../../lib/db";
import { deliver } from "../../../../../lib/send";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { text } = await request.json();
  if (typeof text !== "string" || !text.trim()) return Response.json({ error: "Message is empty" }, { status: 400 });
  const [conversation] = await query("select * from conversations where id = $1", [params.id]);
  if (!conversation) return Response.json({ error: "Not found" }, { status: 404 });
  const sent = await deliver(conversation, text.trim(), "human");
  return Response.json({ sent }, { status: sent ? 200 : 502 });
}
