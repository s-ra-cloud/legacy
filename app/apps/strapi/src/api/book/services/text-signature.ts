import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyTextReplacement(
  body: string, timestamp: string, signature: string, secret: string, now = Date.now(),
) {
  if (!secret || !/^\d+$/.test(timestamp) || Math.abs(now - Number(timestamp)) > 60_000 ||
      !/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", secret)
    .update(`neoalexandria-text\n${timestamp}\n${body}`).digest();
  return timingSafeEqual(Buffer.from(signature, "hex"), expected);
}
