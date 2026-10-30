export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.EMAIL_POLL_SECONDS && process.env.EMAIL_ADDRESS) {
    const { startEmailPolling } = await import("./lib/emailPoll");
    startEmailPolling(Number(process.env.EMAIL_POLL_SECONDS) * 1000);
  }
}
