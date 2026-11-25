import { z } from "zod";
export { sha256 } from "@noble/hashes/sha2.js";

export const KT_SNAPSHOT = "2026-04-23";
export const KT_BATCH_ROWS = 1000;
export const ktKinds = ["locations", "people", "connect", "authorPub", "peopleGrant"] as const;
export type KTKind = typeof ktKinds[number];
export type KTSource = { name: string; kind: KTKind; sha256: string; bytes: number; rowsRead: number; rowsWritten: number; rejected: number };
// Original, checksum-pinned exports. Keep in sync with recovery-sources.json.
export const ktSources: KTSource[] = [
  {name:"locations.csv_1793810375103.gz",kind:"locations",sha256:"aadbb74fc851fcb4b3662b32a123fd14697200c564c7122ee9a55cb774d138d1",bytes:1650328,rowsRead:50771,rowsWritten:50771,rejected:0},
  {name:"people.csv_1793810375105.gz",kind:"people",sha256:"e36c133842fd8281897b1f6074ab34d7a223268f580f3f8e248116d512f4c29b",bytes:34946271,rowsRead:896345,rowsWritten:896262,rejected:0},
  {name:"connect.csv_1793810375104.gz",kind:"connect",sha256:"0fb2bedf7681ed4a6e9d6264f54b4a622f9fbf8686e8df9d4ebdb2b555be393c",bytes:56525915,rowsRead:1863999,rowsWritten:1850796,rejected:0},
  {name:"authorPub05.csv_1793810375106.gz",kind:"authorPub",sha256:"da76b576ecfd317da5c9157d6ecc97327cd73f832a347ffefb8d660f056ae3b1",bytes:293364249,rowsRead:17917824,rowsWritten:17902468,rejected:0},
  {name:"authorPub10.csv_1793810375105.gz",kind:"authorPub",sha256:"021ba727a0778fe9225f660d80f1defd8f28c287de358e98d82b838d4ad10405",bytes:173954121,rowsRead:12173961,rowsWritten:12169498,rejected:0},
  {name:"authorPub15.csv_1793810375105.gz",kind:"authorPub",sha256:"91de1075cf151a4eaa329efe777947736351dd1519cf8249b3231c710470028e",bytes:208030641,rowsRead:13565161,rowsWritten:13552706,rejected:0},
  {name:"authorPub20.csv_1793810375105.gz",kind:"authorPub",sha256:"b27dd5e64de2e77c5187eeab6c5f5df4ddb53e8a9a1b649600db0208d5e014bc",bytes:337196222,rowsRead:18379481,rowsWritten:18348439,rejected:0},
  {name:"authorPub25.csv_1793810375105.gz",kind:"authorPub",sha256:"3c915657f4b77d2cf5bc03747349c8d9259ffe775acbaf10e439d7e18cbd98d5",bytes:221959225,rowsRead:10904723,rowsWritten:10863080,rejected:0},
  {name:"authorPub30.csv_1793810375105.gz",kind:"authorPub",sha256:"a389e64334fb3086bcfca2438ec7dec38eb251003f81274baa183f24113b2198",bytes:173785056,rowsRead:11641162,rowsWritten:11625615,rejected:1},
  {name:"authorPub35.csv_1793810375104.gz",kind:"authorPub",sha256:"f49b4d4e446faf068429655458b9d1c7523cd6331f4c3901135bd9527d9d3b91",bytes:231272603,rowsRead:18561522,rowsWritten:18558566,rejected:0},
  {name:"peopleGrant.csv_1793810375103.gz",kind:"peopleGrant",sha256:"bf5f5eb7ce12230597dcf34579966dccb145d42102691f9331b79b0ba8c2d8a2",bytes:131393530,rowsRead:6954331,rowsWritten:6954331,rejected:0},
];
export const ktRequired: Record<KTKind, string[]> = {
  locations: ["locid","location","country","lat","lon"],
  people: ["pid","firstname","middlename","lastname","location","locid","majorarea"],
  connect: ["cid","pid1","pid2","relation","locid","stopdate"],
  authorPub: ["pubid","pid","score_total","score_human","pmid","doi","s2id","citations"],
  peopleGrant: ["grantid","pid","score","score_human","APPLICATION_ID","FULL_PROJECT_NUM","BUDGET_START"],
};
export function validKTHeader(kind: KTKind, header: string[]) {
  return header.length <= 100 && new Set(header.map(h => h.toLowerCase())).size === header.length
    && ktRequired[kind].every(h => header.includes(h));
}
const name = z.string().refine(n => ktSources.some(s => s.name === n), "Choose an original snapshot archive");
export const ktStartSchema = z.object({
  name, sha256: z.string().regex(/^[0-9a-f]{64}$/), bytes: z.number().int().positive(),
  maxDatabaseGiB: z.number().min(1).max(1000), confirm: z.literal(true),
}).strict();
export const ktBatchSchema = z.object({
  name, start: z.number().int().nonnegative(),
  header: z.array(z.string().max(100)).min(1).max(100),
  rows: z.array(z.array(z.string().max(131072)).max(100)).min(1).max(KT_BATCH_ROWS),
}).strict();
export const ktFinishSchema = z.object({ name }).strict();
export type KTProgress = KTSource & {
  status: string; rowsProcessed: number; rowsInserted: number; rowsRejected: number;
};
export type KTImportState = {
  environment: "development" | "production";
  target: "public.knowledge_tree_*";
  schemaReady: boolean; message: string; databaseBytes: number;
  sources: KTProgress[];
};
export type KTCheckpoint = { name: string; rowsProcessed: number; rowsInserted: number; rowsRejected: number; status: string };

export const ktCoreActionSchema = z.object({
  action: z.enum(["start", "step", "activate", "original"]),
  expectedRevision: z.number().int().nonnegative(),
  confirm: z.literal(true),
}).strict();
export type KTCoreState = {
  version: 1;
  revision: number;
  fingerprint: string;
  phase: "locations" | "people" | "connect" | "degrees" | "verified";
  cursor: number;
  counts: { locations: number; people: number; connect: number; valid: number; invalid: number; self: number; orphan: number; degrees: number; degreeTotal: number };
  active: "original" | "recovery";
  verifiedAt: string | null;
};
export type KTCoreStatus = {
  state: KTCoreState | null;
  current: boolean;
  ready: boolean;
  message: string;
};
export type KTReferenceCoverage = {
  status: "not_imported" | "partial" | "failed" | "complete" | "unavailable";
  completed: number;
  expected: number;
};
export type KTCoreAction = z.infer<typeof ktCoreActionSchema>;
