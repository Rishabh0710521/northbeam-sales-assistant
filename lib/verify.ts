import { createHmac, timingSafeEqual } from "node:crypto";

export function validSignature(rawBody: string, header: string | null, secret: string | undefined) {
  if (!secret || !header) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  return a.length === b.length && timingSafeEqual(a, b);
}
