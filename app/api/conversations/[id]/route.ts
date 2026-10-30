import { query } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const [conversation] = await query("select * from conversations where id = $1", [params.id]);
  if (!conversation) return Response.json({ error: "Not found" }, { status: 404 });
  const messages = await query("select id, direction, author, body, created_at from messages where conversation_id = $1 order by id", [params.id]);
  const actions = await query("select id, kind, detail, ok, created_at from actions where conversation_id = $1 order by id desc limit 80", [params.id]);
  const [booking] = await query("select rep_id, slot_start, slot_end, status, detail, event_link from bookings where conversation_id = $1", [params.id]);
  return Response.json({ conversation, messages, actions, booking: booking ?? null });
}
