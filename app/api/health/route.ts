import { query } from "../../../lib/db";

export const dynamic = "force-dynamic";

const requirements: Record<string, string[]> = {
  whatsapp: ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_VERIFY_TOKEN", "APP_SECRET_META"],
  instagram: ["INSTAGRAM_ACCESS_TOKEN", "INSTAGRAM_VERIFY_TOKEN", "APP_SECRET_META"],
  email: ["EMAIL_ADDRESS", "EMAIL_APP_PASSWORD"],
  calendar: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN", "CALENDAR_ID_ASHA", "CALENDAR_ID_ROHAN"]
};

export async function GET() {
  const states = await query("select * from integration_state");
  const items = Object.entries(requirements).map(([name, vars]) => {
    const configured = vars.every((v) => Boolean(process.env[v]));
    const state = states.find((s: any) => s.name === name);
    let status = "not_configured";
    if (configured) status = state ? (state.ok ? "connected" : "problem") : "configured";
    return { name, status, detail: state?.detail ?? null };
  });
  return Response.json({ items });
}
