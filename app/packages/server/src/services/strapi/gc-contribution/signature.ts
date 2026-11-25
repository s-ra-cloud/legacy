import { createHmac } from "node:crypto";

export function signOwnerReference(body: string, timestamp: string, secret: string) {
  return createHmac("sha256", secret)
    .update(`legacy-owner-reference\n${timestamp}\n${body}`).digest("hex");
}

export function signReference(body: string, timestamp: string, secret: string) {
  return createHmac("sha256", secret)
    .update(`legacy-scholarly-reference\n${timestamp}\n${body}`).digest("hex");
}

export function signAdminEdit(body: string, timestamp: string, secret: string) {
  return createHmac("sha256", secret)
    .update(`legacy-admin-contribution-edit\n${timestamp}\n${body}`).digest("hex");
}

export function signReferenceResume(body: string, timestamp: string, secret: string) {
  return createHmac("sha256", secret)
    .update(`legacy-scholarly-reference-resume\n${timestamp}\n${body}`).digest("hex");
}

export function signConnectionDecision(body: string, timestamp: string, secret: string) {
  return createHmac("sha256", secret)
    .update(`legacy-admin-connection-decision\n${timestamp}\n${body}`).digest("hex");
}
