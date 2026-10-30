import { query } from "../../../../../lib/db";
import { logAction } from "../../../../../lib/log";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { on } = await request.json();
  await query("update conversations set takeover = $2, updated_at = now() where id = $1", [params.id, Boolean(on)]);
  await logAction(params.id, on ? "takeover_on" : "takeover_off", on ? "A team member took over. Automatic actions stopped." : "Automatic handling resumed.");
  return Response.json({ takeover: Boolean(on) });
}
