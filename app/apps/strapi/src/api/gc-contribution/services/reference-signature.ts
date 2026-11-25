import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyOwnerReference(body: string, timestamp: string, signature: string, secret: string, now = Date.now()) {
  if (!secret || !/^\d+$/.test(timestamp) || Math.abs(now - Number(timestamp)) > 60_000 ||
      !/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", secret)
    .update(`legacy-owner-reference\n${timestamp}\n${body}`).digest();
  return timingSafeEqual(Buffer.from(signature, "hex"), expected);
}

export function verifyReference(body: string, timestamp: string, signature: string, secret: string, now = Date.now()) {
  if (!secret || !/^\d+$/.test(timestamp) || Math.abs(now - Number(timestamp)) > 60_000 ||
      !/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", secret)
    .update(`legacy-scholarly-reference\n${timestamp}\n${body}`).digest();
  return timingSafeEqual(Buffer.from(signature, "hex"), expected);
}

export function verifyAdminContributionEdit(body: string, timestamp: string, signature: string, secret: string, now = Date.now()) {
  if (!secret || !/^\d+$/.test(timestamp) || Math.abs(now - Number(timestamp)) > 60_000 ||
      !/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", secret)
    .update(`legacy-admin-contribution-edit\n${timestamp}\n${body}`).digest();
  return timingSafeEqual(Buffer.from(signature, "hex"), expected);
}

export function verifyReferenceResume(body: string, timestamp: string, signature: string, secret: string, now = Date.now()) {
  if (!secret || !/^\d+$/.test(timestamp) || Math.abs(now - Number(timestamp)) > 60_000 ||
      !/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", secret)
    .update(`legacy-scholarly-reference-resume\n${timestamp}\n${body}`).digest();
  return timingSafeEqual(Buffer.from(signature, "hex"), expected);
}

export function verifyConnectionDecision(body: string, timestamp: string, signature: string, secret: string, now = Date.now()) {
  if (!secret || !/^\d+$/.test(timestamp) || Math.abs(now - Number(timestamp)) > 60_000 ||
      !/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", secret)
    .update(`legacy-admin-connection-decision\n${timestamp}\n${body}`).digest();
  return timingSafeEqual(Buffer.from(signature, "hex"), expected);
}
