import { pollEmail } from "../../../../lib/emailPoll";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const received = await pollEmail();
    return Response.json({ received });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Inbox check failed" }, { status: 502 });
  }
}
