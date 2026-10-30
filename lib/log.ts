import { query } from "./db";

export async function logAction(conversationId: string | null, kind: string, detail: string, ok = true) {
  await query("insert into actions (conversation_id, kind, detail, ok) values ($1, $2, $3, $4)", [
    conversationId,
    kind,
    detail.slice(0, 1000),
    ok
  ]);
}

export async function setIntegration(name: string, ok: boolean, detail: string | null = null) {
  await query(
    `insert into integration_state (name, ok, detail, updated_at) values ($1, $2, $3, now())
     on conflict (name) do update set ok = $2, detail = $3, updated_at = now()`,
    [name, ok, detail]
  );
}
