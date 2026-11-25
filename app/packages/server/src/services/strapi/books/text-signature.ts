import { createHmac } from "node:crypto";

// Server-only capability: the existing browser-visible contribution token is
// deliberately not sufficient to mutate an existing library text.
export function signTextReplacement(body: string, timestamp: string, secret: string) {
  return createHmac("sha256", secret)
    .update(`neoalexandria-text\n${timestamp}\n${body}`)
    .digest("hex");
}

