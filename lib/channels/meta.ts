import { setIntegration } from "../log";

export async function metaPost(name: string, url: string, token: string | undefined, body: unknown) {
  if (!token) {
    await setIntegration(name, false, "Access token is not configured");
    throw new Error(`${name} access token is not configured`);
  }
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = data?.error?.code;
    const message = data?.error?.message ?? `HTTP ${response.status}`;
    if (code === 190 || response.status === 401) {
      await setIntegration(name, false, `Access token expired or invalid: ${message}`);
    } else {
      await setIntegration(name, false, message);
    }
    throw new Error(message);
  }
  await setIntegration(name, true, null);
  return data;
}
