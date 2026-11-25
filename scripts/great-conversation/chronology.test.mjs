import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const temp = mkdtempSync(join(tmpdir(), "gc-chronology-"));
const root = new URL("../../artifacts/legacy/client/app/lib/", import.meta.url);
const catalogue = JSON.parse(readFileSync(new URL("data/gc-author-births.json", root), "utf8"));
for (const name of ["gc-chronology-layout", "gc-author-births"]) {
  const code = readFileSync(new URL(`${name}.ts`, root), "utf8")
    .replace('import catalogue from "./data/gc-author-births.json";', `const catalogue = ${JSON.stringify(catalogue)};`)
    .replace('import roleReferences from "./data/gc-author-role-references.json";', `const roleReferences = ${readFileSync(new URL("data/gc-author-role-references.json", root), "utf8")};`);
  writeFileSync(join(temp, `${name}.mjs`), ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText);
}
const layout = await import(pathToFileURL(join(temp, "gc-chronology-layout.mjs")));
const births = await import(pathToFileURL(join(temp, "gc-author-births.mjs")));
rmSync(temp, { recursive: true });
const snapshot = JSON.parse(readFileSync(new URL("data/gc-wab.json", root), "utf8"));

test("every archive author has a distinct catalogue record, including unknowns", () => {
  const ids = new Set(catalogue.map((r) => r.id));
  assert.equal(ids.size, catalogue.length);
  for (const n of snapshot.people.nodes) assert.ok(ids.has(n.id), n.name);
  for (const row of catalogue) {
    if (row.birthYear != null) {
      assert.ok(Number.isInteger(row.birthYear) && row.birthYear !== 0);
      assert.ok(["source-matched", "site-record", "reference-source", "estimated", "placement-estimate"].includes(row.status));
      if (row.status === "source-matched") assert.match(row.sourceUrl, /^https:\/\/www.wikidata.org\/wiki\/Q\d+$/);
    }
  }
});

test("dates resolve by identity or unambiguous normalized name, never by arbitrary digits", () => {
  assert.equal(births.resolveAuthorBirth({ id: "new", name: "Immanuel Kant" }).birthYear, 1724);
  assert.equal(births.resolveAuthorBirth({ id: "unknown", name: "Unknown Author 1500", detail: "a book from 1500" }).birthYear, null);
  assert.equal(births.resolveAuthorBirth({ id: "new", name: "New Person", detail: "(1810–1890)" }).birthYear, 1810);
  assert.equal(births.resolveAuthorBirth({ id: "Adam_N.N.", name: "Adam N.N.", detail: "(1810–1890)" }).birthYear, 1810);
  assert.equal(births.normalizeAuthorName("Kant, Immanuel"), births.normalizeAuthorName("Immanuel Kant"));
});

test("chronology starts bottom-left, alternates direction upward, preserves input", () => {
  const items = Array.from({ length: 31 }, (_, n) => ({ id: `n${n}`, label: `Author ${n}`, year: 1000 + n }));
  items.push({ id: "undated", label: "Unknown", year: null });
  const before = JSON.stringify(items);
  const result = layout.layoutChronology([...items].reverse(), { width: 740 });
  const dated = result.cells.filter((c) => c.dated).sort((a, b) => a.order - b.order);
  assert.equal(dated[0].id, "n0");
  assert.equal(dated[0].col, 0);
  for (let n = 0; n < dated.length; n++) {
    const c = dated[n], row = Math.floor(n / result.columns);
    assert.equal(c.row, row);
    assert.equal(c.col, row % 2 === 0 ? n % result.columns : result.columns - 1 - n % result.columns);
    if (n) assert.ok(c.year >= dated[n - 1].year);
    if (row) assert.ok(c.y < dated[0].y);
  }
  assert.equal(result.byId.get("undated").dated, false);
  assert.equal(result.guide.length, items.length - 1);
  assert.equal(layout.hasOverlap(result.cells), false);
  assert.equal(JSON.stringify(items), before);
});

test("phone, desktop and fullscreen widths reflow without overlapping or dropping full names", () => {
  const items = snapshot.people.nodes.map((n) => ({ id: n.id, label: n.name, year: births.resolveAuthorBirth(n).birthYear }));
  items.push({ id: "long", label: "A very long scholarly author name with anExtraordinarilyLongUnbrokenSurname", year: 1801 });
  const columns = [];
  for (const width of [240, 320, 390, 740, 1200, 1920]) {
    const result = layout.layoutChronology(items, { width, minCellWidth: width < 480 ? 112 : 136 });
    columns.push(result.columns);
    assert.equal(result.cells.length, items.length);
    assert.equal(layout.hasOverlap(result.cells), false);
    assert.equal(result.fontSize, 12);
    assert.ok(result.byId.get("long").lines.length > 1);
    for (const c of result.cells) {
      assert.ok(c.x >= 0 && c.x + c.w <= width + 0.01);
      assert.ok(c.lines.length * result.lineHeight + 22 <= c.h);
    }
  }
  assert.ok(columns[0] < columns.at(-1));
});

test("BCE precedes CE, equal years have stable ties, unknown dates are never year zero", () => {
  const items = [
    { id: "b", label: "B", year: 100 },
    { id: "c", label: "C", year: null },
    { id: "a", label: "A", year: -384 },
    { id: "d", label: "D", year: 100 },
  ];
  const sorted = layout.sortChronologically(items);
  assert.deepEqual(sorted.dated.map((x) => x.id), ["a", "b", "d"]);
  assert.deepEqual(sorted.undated.map((x) => x.id), ["c"]);
  assert.equal(layout.formatYear(-384), "384 BCE");
  assert.equal(births.formatBirthYear(null), "Birth date unknown");
});

test("short scholarly datasets stay bottom aligned in tall fullscreen containers", () => {
  const items = [{ id: "first", label: "Earlier", year: 1287 }, { id: "last", label: "Later", year: 1889 }];
  for (const width of [320, 800, 1600]) {
    const result = layout.layoutChronology(items, { width, minHeight: 900 });
    assert.equal(result.height, 900);
    assert.ok(result.byId.get("first").y > 700);
    assert.equal(layout.hasOverlap(result.cells), false);
    assert.ok(result.rows[0].y + 12 < result.byId.get("first").cy);
  }
});

test("every current individual has a date or labelled estimate and a binary classification", () => {
  for (const row of catalogue) {
    assert.ok(["author", "non-author"].includes(row.role), row.name);
    assert.ok(row.roleBasis && row.roleStatus, row.name);
    if (row.roleStatus === "non-person") {
      assert.equal(row.role, "non-author");
      continue;
    }
    assert.ok(Number.isInteger(row.birthYear) && row.birthYear !== 0, row.name);
    if (row.status === "placement-estimate" || row.status === "estimated") {
      assert.equal(row.precision, "approximate-year");
      assert.ok(row.estimateBasis, row.name);
      assert.equal(row.birthDate, null);
    }
    if (row.status === "placement-estimate") assert.match(row.estimateBasis, /not a known birth year/);
  }
});

test("oral teaching qualifies as authorship without a personally written book", () => {
  for (const person of [{ id: "Sokrates", name: "Sokrates" }, { id: "Epictetus", name: "Epictetus" }]) {
    const role = births.resolveAuthorRole(person);
    assert.equal(role.role, "author");
    assert.match(role.basis, /taught/i);
  }
  assert.equal(births.resolveAuthorRole({ id: "new-scholar", name: "A new book author", isAuthor: true }).role, "author");
});

test("authors-only filtering preserves source data and can include non-authors again", () => {
  const nodes = [
    { id: "Sokrates", name: "Sokrates" },
    { id: "Bach__Johann_Sebastian", name: "Bach, Johann Sebastian" },
    { id: "Epictetus", name: "Epictetus" },
  ];
  const before = JSON.stringify(nodes);
  assert.deepEqual(births.filterAuthors(nodes, true).map(n => n.id), ["Sokrates", "Epictetus"]);
  assert.deepEqual(births.filterAuthors(nodes, false), nodes);
  assert.equal(JSON.stringify(nodes), before);
});
