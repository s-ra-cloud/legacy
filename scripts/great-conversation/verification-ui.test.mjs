import { test, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mount, unmount, dispose, click, get, search, key, services, inputValue, setMinimum } from "./ui/chronology-harness.mjs";
afterEach(async () => {
  await unmount();
  services.session = null; services.detail = { isPending: true }; services.mutationError = null; services.submissions = [];
});
after(dispose);
const date = { label: "Unknown", precision: "unknown", startYear: null, endYear: null, kind: "birth" };
const detail = { key: "wab:person:test", kind: "person", revision: 0, sourceToken: "a".repeat(64),
  values: { firstName: "Test", lastName: null, birthDate: date }, original: { name: "Original Test" }, history: [] };
const people = { nodes: [{ id: detail.key, name: "Test", isAuthor: true }, { id: "peer", name: "Peer", isAuthor: true }], links: [{id: "pair", source: detail.key, target: "peer", stance: "approval", uncertain: false}] };
const button = text => [...document.querySelectorAll("button")].find(b => b.textContent === text);
async function select() { await search("Test"); await click(`button-search-result-${detail.key}`); }
test("anonymous inspector exposes originals but not submission", async () => {
  services.detail = { data: detail };
  await mount(390, 500, { people });
  await select();
  assert.match(get("panel-inspector").textContent, /Original Test/);
  assert.equal(button("Verify information"), undefined);
  assert.match(get("panel-inspector").textContent, /Sign in to LEGACY/);
});
test("mobile fullscreen editor closes before fullscreen and reports mutation failure without losing input", async () => {
  services.detail = { data: detail };
  services.session = { user: { id: "account" } };
  await mount(390, 500, { people });
  await select();
  await click("button-enter-fullscreen");
  await click(button("Verify information"));
  assert.ok(document.querySelector('form[aria-label="Verify information"]'));
  await key(document.activeElement, "Escape");
  assert.equal(document.querySelector('form[aria-label="Verify information"]'), null);
  assert.ok(get("dialog-graph-fullscreen"));
  await click(button("Verify information"));
  assert.equal(button("Confirm verification").disabled, false, "No extra confirmation checkbox is needed for people");
  services.mutationError = "Someone verified this record while you were reviewing it.";
  await click(button("Confirm verification"));
  assert.match(get("panel-inspector").textContent, /Someone verified this record/);
  assert.ok(document.querySelector('form[aria-label="Verify information"]'));
  assert.deepEqual(services.submissions[0].coverage, ["firstName", "lastName", "birthDate"]);
  assert.equal(services.submissions[0].source, null);
  services.mutationError = null;
  await click(button("Confirm verification"));
  assert.match(get("panel-inspector").textContent, /Verification saved/);
});

const form = () => document.querySelector('form[aria-label="Verify information"]');
const field = label => [...form().querySelectorAll("label")].find(l =>
  [...l.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join("").trim() === label
)?.querySelector("input, textarea, select");
async function openPerson(values = detail.values) {
  services.detail = { data: { ...detail, values } };
  services.session = { user: { id: "account" } };
  await mount(390, 500, { people });
  await select();
  await click(button("Verify information"));
}
test("person review has only names, birth year, approximation and source, with BCE and mononym help", async () => {
  await openPerson();
  assert.equal(form().querySelectorAll("input").length, 4);
  assert.equal(form().querySelectorAll("textarea").length, 1);
  assert.equal(form().querySelectorAll("select").length, 0);
  assert.equal(button("Reload current values"), undefined);
  assert.match(form().textContent, /A mononym is a single name, such as Socrates/);
  assert.match(form().textContent, /-470 means 470 BCE/);
  assert.match(form().textContent, /There is no year 0/);
  assert.doesNotMatch(form().textContent, /full label|Date precision|Chronology year|Ending year|I reviewed every field/);
  await inputValue(field("First name"), "Socrates");
  await inputValue(field("Birth year"), "-470");
  await click(field("Birth year is approximate"));
  await inputValue(field("Source (optional)"), "Diogenes Laertius, Lives of Eminent Philosophers");
  await click(button("Confirm verification"));
  assert.equal(form(), null);
  assert.deepEqual(services.submissions[0].values, {
    firstName: "Socrates", lastName: null,
    birthDate: { label: "c. 470 BCE", precision: "approximate", startYear: -470, endYear: null, kind: "birth" },
  });
  assert.equal(services.submissions[0].source, "Diogenes Laertius, Lives of Eminent Philosophers");
});
test("a mononym may use last name; CE years and blank unknown years serialize without extra date fields", async () => {
  await openPerson();
  await inputValue(field("First name"), "");
  await inputValue(field("Last name"), "Epictetus");
  await inputValue(field("Birth year"), "50");
  await click(button("Confirm verification"));
  assert.deepEqual(services.submissions[0].values, {
    firstName: null, lastName: "Epictetus",
    birthDate: { label: "50", precision: "year", startYear: 50, endYear: null, kind: "birth" },
  });
  await click(button("Verify information"));
  await click(button("Confirm verification"));
  assert.deepEqual(services.submissions[1].values.birthDate, date);
});
test("zero and missing names cannot be submitted; existing dates initialize year and approximation", async () => {
  await openPerson({ firstName: "Test", lastName: null, birthDate: { ...date, label: "c. 1660", startYear: 1660, precision: "approximate" } });
  assert.equal(field("Birth year").value, "1660");
  assert.equal(field("Birth year is approximate").checked, true);
  await inputValue(field("Birth year"), "0");
  await click(button("Confirm verification"));
  assert.equal(services.submissions.length, 0);
  assert.match(get("panel-inspector").textContent, /no year zero/);
  await inputValue(field("Birth year"), "1660");
  await inputValue(field("First name"), "");
  await click(button("Confirm verification"));
  assert.equal(services.submissions.length, 0);
  assert.match(get("panel-inspector").textContent, /Enter at least one name part/);
  await inputValue(field("Last name"), "Test");
  await click(field("Birth year is approximate"));
  await click(button("Confirm verification"));
  assert.equal(services.submissions[0].values.birthDate.precision, "year");
});
async function openWork(workDate = { label: "1900", precision: "year", startYear: 1900, endYear: null, kind: "publication" }) {
  const workKey = "wab:work:test";
  const values = { title: "Test Work", date: workDate };
  services.detail = { data: { ...detail, key: workKey, kind: "work", values } };
  services.session = { user: { id: "account" } };
  await mount(390, 500, { people, workData: {
    nodes: [{ id: workKey, name: "Test Work", workTitle: "Test Work" }, { id: "peer", name: "Peer Work" }],
    links: [{ id: "pair", source: workKey, target: "peer", stance: "approval", uncertain: false }],
  } });
  await click("button-kind-works");
  await setMinimum(0);
  await search("Test Work");
  await click(`button-search-result-${workKey}`);
  await click(button("Verify information"));
  return values;
}
test("work review uses only title, year, approximation, date meaning and source", async () => {
  const values = await openWork();
  assert.equal(form().querySelectorAll("input").length, 3);
  assert.equal(form().querySelectorAll("select").length, 1);
  assert.equal(form().querySelectorAll("textarea").length, 1);
  assert.doesNotMatch(form().textContent, /full label|Date precision|Chronology year|Ending year|I reviewed every field/);
  assert.match(form().textContent, /-350 means 350 BCE/);
  assert.equal(field("Year").value, "1900");
  assert.equal(field("Year is approximate").checked, false);
  assert.equal(field("Date meaning").value, "publication");
  assert.equal(button("Confirm verification").disabled, false);
  await click(button("Confirm verification"));
  assert.deepEqual(services.submissions[0].values, values);
});
test("work BCE approximations retain the chosen date meaning and supporting URL", async () => {
  await openWork();
  await inputValue(field("Year"), "-350");
  await click(field("Year is approximate"));
  await inputValue(field("Date meaning"), "composition");
  await inputValue(field("Supporting reference or URL (optional)"), "https://example.org/reference");
  await click(button("Confirm verification"));
  assert.deepEqual(services.submissions[0].values.date, {
    label: "c. 350 BCE", precision: "approximate", startYear: -350, endYear: null, kind: "composition",
  });
  assert.equal(services.submissions[0].source, "https://example.org/reference");
});
test("work years reject zero, allow unknown, and prefill approximate dates", async () => {
  await openWork({ label: "c. 1900", precision: "approximate", startYear: 1900, endYear: null, kind: "edition" });
  assert.equal(field("Year is approximate").checked, true);
  await inputValue(field("Year"), "0");
  await click(button("Confirm verification"));
  assert.equal(services.submissions.length, 0);
  assert.match(get("panel-inspector").textContent, /no year zero/);
  await inputValue(field("Year"), "");
  await click(button("Confirm verification"));
  assert.deepEqual(services.submissions[0].values.date, {
    label: "Unknown", precision: "unknown", startYear: null, endYear: null, kind: "edition",
  });
});
