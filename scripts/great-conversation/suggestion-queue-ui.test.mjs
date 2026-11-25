import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const page = await readFile(resolve(root, "artifacts/legacy/client/app/components/admin/pages/great-conversation/proposals.tsx"), "utf8");
const queue = await readFile(resolve(root, "artifacts/legacy/client/app/components/admin/pages/great-conversation/suggestion-queue.tsx"), "utf8");
const history = await readFile(resolve(root, "artifacts/legacy/client/app/components/pages/my-record/gc-contributions-list.tsx"), "utf8");

test("administrator queue exposes linked and direct requests with complete catalogue actions", () => {
  assert.match(page, /requested-books\/admin\/review/);
  assert.match(page, /cursor=\$\{page\}&limit=25&search=/);
  assert.match(page, /requested-books\/admin\/\$\{encodeURIComponent\(id\)\}\/review/);
  assert.match(queue, /This passage is context for the catalogue request only/);
  assert.match(queue, /This direct catalogue request can be reviewed on its own/);
  assert.match(queue, /Link catalogue record/);
  assert.match(queue, /Create catalogue author/);
  assert.match(queue, /Create catalogue work/);
  assert.match(queue, /Original publication date/);
  assert.match(queue, /Upload work text/);
  assert.match(queue, /Upload work cover/);
  assert.match(queue, /Reject catalogue suggestion/);
  assert.doesNotMatch(queue, /requesterEmail|requesterUserId/);
});

test("contributor history is authenticated, private, stateful and resumes only ready connections", () => {
  assert.match(history, /gc-contributions\/mine/);
  assert.doesNotMatch(history, /contributor\/\$\{|searchParams\.set\("email"/);
  assert.match(history, /Awaiting catalogue review/);
  assert.match(history, /Ready to continue/);
  assert.match(history, /Back in editorial review/);
  assert.match(history, /continuationState === "ready_to_continue"/);
  assert.match(history, /Continue connection/);
  assert.match(history, /resumeContribution=\{resume\}/);
});
