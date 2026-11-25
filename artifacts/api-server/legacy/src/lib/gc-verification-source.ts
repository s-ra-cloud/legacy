import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { AuthorsCMS } from "../cms/authors.js";
import { BooksCMS } from "../cms/books.js";
import type { PersonValues, WorkValues, RelationValues, ReviewedDate } from "@repo/shared/gc-verification";
import { resolveRelationSource } from "./gc-relation-source.js";

function dataRoot() {
  let root = process.cwd();
  while (!existsSync(join(root, "artifacts/legacy/client/app/lib/data/gc-wab.json"))) {
    const parent = dirname(root);
    if (root === parent) throw new Error("Archive source files unavailable");
    root = parent;
  }
  return join(root, "artifacts/legacy/client/app/lib/data");
}
let archive: Promise<{ snapshot: any; births: Map<string, any>; evidenceCatalogue: any }> | undefined;
function loadArchive() {
  return archive ??= Promise.all(["gc-wab.json", "gc-author-births.json", "gc-relation-evidence.json.gz"].map(async name => {
    const bytes = await readFile(join(dataRoot(), name));
    return JSON.parse((name.endsWith(".gz") ? gunzipSync(bytes) : bytes).toString("utf8"));
  })).then(([snapshot, births, evidenceCatalogue]) => ({ snapshot, births: new Map<string, any>(births.map((b: any) => [b.id, b])), evidenceCatalogue }))
    .catch(e => { archive = undefined; throw e; });
}
const unknown = (kind: ReviewedDate["kind"]): ReviewedDate => ({ label: "", precision: "unknown", startYear: null, endYear: null, kind });
/** Only structured evidence supplies chronology. Unparsed source strings remain
 * visible in original; reviewers must explicitly describe their meaning. */
function sourceDate(label: string | null | undefined, kind: ReviewedDate["kind"]): ReviewedDate {
  if (!label) return unknown(kind);
  const match = label.trim().match(/^([1-9]\d{0,3})(?:\s*(BCE|BC|CE|AD))?$/i);
  return match ? { label, kind, precision: "year", startYear: Number(match[1]) * (/^BC/i.test(match[2] ?? "") ? -1 : 1), endYear: null }
    : { ...unknown(kind), label };
}
export async function resolveVerificationSource(key: string) {
  const [namespace, kind, ...tail] = key.split(":");
  const id = tail.join(":");
  let original: Record<string, unknown>;
  let values: PersonValues | WorkValues | RelationValues;
  if (kind === "relation") {
    const loaded = namespace === "wab" ? await loadArchive() : null;
    const source = await resolveRelationSource(namespace!, id, loaded?.snapshot, loaded?.evidenceCatalogue);
    if (!source) return null;
    ({ original, values } = source);
  } else if (namespace === "wab") {
    const { snapshot, births } = await loadArchive();
    const node = snapshot[kind === "person" ? "people" : "works"].nodes.find((n: any) => n.id === id);
    if (!node) return null;
    const birth = kind === "person" ? births.get(id) : undefined;
    original = { namespace, kind, id, node, ...(birth ? { biography: birth } : {}), snapshot: snapshot.snapshot, attribution: snapshot.attribution, reviewNotice: snapshot.reviewNotice };
    if (kind === "person") {
      const factual = birth && !["placement-estimate", "estimated"].includes(birth.status) ? birth : null;
      values = { firstName: null, lastName: null, birthDate: factual?.birthYear
        ? { label: factual.birthDate || `${Math.abs(factual.birthYear)}${factual.birthYear < 0 ? " BCE" : ""}`, precision: factual.precision === "year" ? "year" : "approximate", startYear: factual.birthYear, endYear: null, kind: "birth" }
        : unknown("birth") };
    } else {
      values = { title: node.workTitle || node.name, date: sourceDate(node.publicationDate?.year, node.publicationDate?.kind === "edition" ? "edition" : "publication") };
    }
  } else if (namespace === "cms" && kind === "person") {
    const a = await new AuthorsCMS().get(id);
    if (!a || a.documentId !== id) return null;
    // Public source fields only: do not expose account/contributor email data.
    original = { namespace, kind, id, firstName: a.firstName, lastName: a.lastName, birthDeath: a.birthDeath };
    values = { firstName: a.firstName ?? null, lastName: a.lastName ?? null, birthDate: unknown("birth") };
  } else if (namespace === "cms" && kind === "work") {
    const b = await new BooksCMS().get(id);
    if (!b || b.documentId !== id) return null;
    original = { namespace, kind, id, title: b.BookTitle, originalPublicationDate: b.OriginalPublicationDate, author: b.author && { documentId: b.author.documentId, firstName: b.author.firstName, lastName: b.author.lastName } };
    values = { title: b.BookTitle, date: sourceDate(b.OriginalPublicationDate, "publication") };
  } else return null;
  return { original, values, sourceToken: createHash("sha256").update(JSON.stringify(original)).digest("hex") };
}
