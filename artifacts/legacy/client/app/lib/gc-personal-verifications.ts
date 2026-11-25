import { getRestApiOrigin } from "@repo/shared/env-client";
import {
  amendmentInput,
  personalVerificationDetailSchema,
  personalVerificationListSchema,
  type PersonalVerificationDetail,
  type PersonalVerificationList,
  type PersonValues,
  type RelationValues,
  type ReviewedDate,
  type WorkValues,
} from "@repo/shared/gc-verification";

/** Every personal key starts with the signed-in user's ID so accounts never share cache. */
export const personalRootKey = (userId: string) => ["gc-personal-verifications", userId] as const;
export interface PersonalFilters { search: string; kind: "" | "person" | "work" | "relation"; from: string; to: string }
export const emptyFilters: PersonalFilters = { search: "", kind: "", from: "", to: "" };
export const personalListKey = (userId: string, f: PersonalFilters, cursor: string | null) =>
  [...personalRootKey(userId), "list", f.search.trim(), f.kind, f.from, f.to, cursor ?? ""] as const;
export const personalDetailKey = (userId: string, submissionId: string) =>
  [...personalRootKey(userId), "detail", submissionId] as const;

export class PersonalRequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
/** True when the server rejected a save because the review context moved on. */
export const isConflict = (e: unknown) => e instanceof PersonalRequestError && (e.status === 409 || e.status === 412);

async function request(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(new URL(`/api/v1/${path}`, getRestApiOrigin()), {
    credentials: "include", ...init, signal: init?.signal ?? AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new PersonalRequestError(typeof body?.error === "string" ? body.error : `Request failed (${res.status}). Please retry.`, res.status);
  }
  return res.json();
}

export function listPath(f: PersonalFilters, cursor: string | null, limit = 10): string {
  const p = new URLSearchParams();
  if (f.search.trim()) p.set("search", f.search.trim());
  if (f.kind) p.set("kind", f.kind);
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  if (cursor) p.set("cursor", cursor);
  p.set("limit", String(limit));
  return `gc-verifications/mine?${p.toString()}`;
}

export async function fetchPersonalList(f: PersonalFilters, cursor: string | null, signal: AbortSignal): Promise<PersonalVerificationList> {
  const parsed = personalVerificationListSchema.safeParse(await request(listPath(f, cursor), { signal }));
  if (!parsed.success) throw new Error("Your verification history arrived incomplete. Please retry.");
  return parsed.data;
}
export async function fetchPersonalDetail(id: string, signal: AbortSignal): Promise<PersonalVerificationDetail> {
  const parsed = personalVerificationDetailSchema.safeParse(await request(`gc-verifications/mine/${encodeURIComponent(id)}`, { signal }));
  if (!parsed.success) throw new Error("This verification record arrived incomplete. Please retry.");
  return parsed.data;
}
export async function saveAmendment(id: string, body: unknown): Promise<void> {
  await request(`gc-verifications/mine/${encodeURIComponent(id)}/amend`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

export const graphLink = (key: string) => `/projects/great-conversation?entity=${encodeURIComponent(key)}#conversation-graph`;

/** Year-only review, matching the public editor. */
export function reviewedYear(year: number | null, approximate: boolean, kind: ReviewedDate["kind"]): ReviewedDate {
  return {
    kind, startYear: year, endYear: null,
    precision: year === null ? "unknown" : approximate ? "approximate" : "year",
    label: year === null ? "Unknown" : `${approximate ? "c. " : ""}${year < 0 ? `${Math.abs(year)} BCE` : year}`,
  };
}
export function formatYear(d: ReviewedDate): string {
  if (d.precision === "unknown" || d.startYear === null) return "Unknown";
  return d.label || String(d.startYear);
}

export type DraftValues = PersonValues | WorkValues | RelationValues;
export interface AmendBase { ownRevisionId: string; revision: number; sourceToken: string }

/** Builds and validates the amendment body. Never retries; caller saves explicitly. */
export function buildAmendment(key: string, kind: "person" | "work" | "relation", values: DraftValues, approximate: boolean, source: string, base: AmendBase) {
  let submitted: DraftValues = values;
  if ("birthDate" in values) submitted = { ...values, birthDate: reviewedYear(values.birthDate.startYear, approximate, "birth") };
  else if ("date" in values) submitted = { ...values, date: reviewedYear(values.date.startYear, approximate, values.date.kind) };
  const coverage = kind === "person" ? ["firstName", "lastName", "birthDate"] : kind === "work" ? ["title", "date"] : ["evidence", "connectionType", "stance", "assessment"];
  return amendmentInput.safeParse({
    review: { key, kind, values: submitted, expectedRevision: base.revision, sourceToken: base.sourceToken, coverage, source: source.trim() || null },
    expectedOwnRevisionId: base.ownRevisionId,
  });
}
