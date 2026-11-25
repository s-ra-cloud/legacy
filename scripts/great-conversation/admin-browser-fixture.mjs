// Run from app/ with its development environment loaded. Never print credentials.
import { randomUUID, createHmac } from "node:crypto";
import { readFile, writeFile, rm } from "node:fs/promises";
import pg from "pg";
if (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1" || !process.env.REPLIT_DEV_DOMAIN) {
  throw new Error("Development-only fixture");
}
const path = "/tmp/gc-admin-browser-records.json";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  if (process.argv.includes("--cleanup")) {
    const { keys } = JSON.parse(await readFile(path, "utf8"));
    const rows = await pool.query("SELECT document_id FROM strapi.gc_contributions WHERE submission_key=ANY($1::varchar[])", [keys]);
    await pool.query("DELETE FROM strapi.requested_books WHERE contribution_document_id=ANY($1::varchar[])", [rows.rows.map(r => r.document_id)]);
    await pool.query("DELETE FROM strapi.gc_contributions WHERE submission_key=ANY($1::varchar[])", [keys]);
    await rm(path);
    console.log("Removed disposable administrator reference records.");
  } else {
    try { await readFile(path); throw new Error("Clean up existing fixture first"); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
    const origin = `https://${process.env.REPLIT_DEV_DOMAIN}`;
    const { data: books } = await (await fetch(`${origin}/api/v1/books?limit=2`)).json();
    const [source, target] = books, keys = [], records = [];
    const marker = `Admin template fixture ${randomUUID().slice(0, 8)}`;
    for (const [explicit, implicit] of [["author", null], ["work", null], ["passage", null], ["work", "passage"], ["historical", null]]) {
      const effective = implicit ?? explicit;
      const submissionKey = randomUUID(); keys.push(submissionKey);
      // Persist cleanup keys before attempting the write, including uncertain writes.
      await writeFile(path, JSON.stringify({ keys, records, marker }), { mode: 0o600 });
      const data = { submissionKey, contributorEmail: "admin-template-fixture@example.test",
        bookA_id: source.documentId, bookA_title: source.BookTitle, bookA_textExcerpt: `${marker}: ${explicit} ${implicit ?? ""}`,
        ...(effective === "author" ? {} : { bookB_id: target.documentId, bookB_title: target.BookTitle }),
        ...(explicit === "historical" ? { connectionType: "explicit" } : { referenceDetails: {
          explicitLevel: explicit, implicitLevel: implicit, effectiveLevel: effective,
          author: { documentId: target.author.documentId, name: target.author.fullName, proposed: false },
          ...(effective === "author" ? {} : { work: { documentId: target.documentId, title: target.BookTitle, proposed: false } }),
        } }),
        ...(["passage", "historical"].includes(effective) ? { bookB_textExcerpt: "Disposable target quotation",
          connectionNature: "agreement", isSimilarityIdeas: true, explainConnection: "Disposable passage explanation" } : {}),
      };
      const timestamp = String(Date.now()), body = JSON.stringify({ actorId: "admin-template-fixture", data });
      const signature = createHmac("sha256", process.env.SESSION_SECRET)
        .update(`legacy-scholarly-reference\n${timestamp}\n${body}`).digest("hex");
      const response = await fetch(`${origin}/strapi/api/gc-contributions/submit-reference`, {
        method: "POST", headers: { "Content-Type": "application/json",
          "x-reference-timestamp": timestamp, "x-reference-signature": signature }, body,
      });
      if (!response.ok) throw new Error(`Fixture submission failed: ${response.status}`);
      records.push({ kind: explicit + (implicit ? `-${implicit}` : ""), documentId: (await response.json()).data.documentId });
    }
    await writeFile(path, JSON.stringify({ keys, records, marker }), { mode: 0o600 });
    console.log("Created five disposable reference formats; identifiers in /tmp/gc-admin-browser-records.json.");
  }
} finally { await pool.end(); }
