import { query } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await query(
    `select c.id, c.channel, c.external_id, c.sender_name, c.status, c.assigned_rep, c.meeting_result, c.takeover, c.updated_at,
            (select body from messages m where m.conversation_id = c.id order by m.id desc limit 1) as last_message
     from conversations c order by c.updated_at desc limit 100`
  );
  return Response.json({ conversations: rows });
}
