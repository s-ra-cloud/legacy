import { createHash } from "node:crypto";
import { type KTKind, validKTHeader } from "@repo/shared/kt-import";

export const ktTables: Record<KTKind, { table: string; columns: string[] }> = {
  locations: {table:"knowledge_tree_locations",columns:["locid","location","shortname","city","state","country","lat","lon"]},
  people: {table:"knowledge_tree_researchers",columns:["pid","full_name","firstname","middlename","lastname","degrees","location","locid","area","majorarea","award","hindex","orcid_id","s2id","ktpid","homepage"]},
  connect: {table:"knowledge_tree_connections",columns:["cid","trainee_id","mentor_id","relation","location","locid","stopdate","dissertation_title","pqid","ktcid"]},
  authorPub: {table:"knowledge_tree_publications",columns:["pubid","pid","score_total","score_human","score_coa","pmid","doi","s2id","citations"]},
  peopleGrant: {table:"knowledge_tree_grants",columns:["row_key","grantid","pid","score","score_human","score_name","score_loc","fedex_pi_id","fedex_name","application_id","budget_start","full_project_num","importdate","dborigin"]},
};
const ints = new Set(["pid","locid","hindex","cid","trainee_id","mentor_id","relation","pubid","score_human","citations","grantid"]);
const bigInts = new Set(["pubid","citations","grantid"]);
const floats = new Set(["lat","lon","score","score_total","score_name","score_loc","score_coa"]);
const ids: Record<KTKind,string[]> = {locations:["locid"],people:["pid"],connect:["cid","trainee_id","mentor_id"],authorPub:["pubid","pid"],peopleGrant:["pid"]};
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");

/** Mirrors the original Python importer, including its grant identity encoding. */
export function normalizeKTRow(kind: KTKind, header: string[], row: string[]) {
  if (!validKTHeader(kind, header) || row.length !== header.length) throw new Error("CSV columns do not match the source format.");
  const values: Record<string,string|null> = Object.create(null);
  header.forEach((key,i) => {
    const value = row[i]!.trim();
    if (value.includes("\0")) throw new Error("Invalid CSV character.");
    values[key.toLowerCase()] = ["","NULL","\\N"].includes(value) ? null : value;
  });
  if (kind === "people") values.full_name = ["firstname","middlename","lastname"].map(k=>values[k]||"").join(" ").trim().replace(/\s+/gu," ");
  if (kind === "connect") { values.trainee_id=values.pid1??null; values.mentor_id=values.pid2??null; }
  // The original snapshot contains exactly one association with no researcher.
  // All other malformed data fails closed, instead of quietly skipping records.
  if (kind === "authorPub" && values.pid === null && values.pubid !== null) return null;
  if (ids[kind].some(k=>values[k] == null)) throw new Error("CSV row is missing a required identifier.");
  if (kind === "peopleGrant") {
    const pythonJson = "{"+Object.keys(values).sort().map(k=>`${JSON.stringify(k)}: ${JSON.stringify(values[k])}`).join(", ")+"}";
    values.row_key=digest(pythonJson);
  }
  const out: Record<string,string|null> = {};
  for (const column of ktTables[kind].columns) {
    let value=values[column]??null;
    if (value!==null && ints.has(column)) {
      if (!/^[+-]?\d+$/.test(value)) throw new Error("CSV integer is invalid.");
      const n=BigInt(value), limit=bigInts.has(column)?9223372036854775807n:2147483647n;
      if(n>limit || n < -limit-1n) throw new Error("CSV integer is out of range.");
      value=n.toString();
    }
    if(value!==null && floats.has(column)) {
      if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value) && !/^[+-]?(?:nan|inf(?:inity)?)$/i.test(value)) throw new Error("CSV number is invalid.");
      const n=Number(value);
      value=Number.isFinite(n)?String(n):null;
    }
    out[column]=value;
  }
  return out;
}
