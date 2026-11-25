// Disposable development-only CMS fixture. Never runs against a published host.
// Run with the existing Legacy dotenv command; do not print environment values.
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

const origin = process.env.LIBRARY_TEST_ORIGIN;
if (!origin || !new URL(origin).hostname.endsWith(".replit.dev")) {
  throw new Error("Set LIBRARY_TEST_ORIGIN to this workspace's development preview");
}
const token = process.env.VITE_STRAPI_CONTRIBUTE_TOKEN;
const secret = process.env.SESSION_SECRET;
assert.ok(token && secret, "Existing development contribution and session configuration is required");
const jsonHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
async function request(path, options = {}) {
  return fetch(`${origin}${path}`, { ...options, redirect: "error" });
}
async function upload(name, contents, type) {
  const form = new FormData();
  form.append("files", new File([contents], name, { type }));
  const response = await request("/strapi/api/upload", {
    method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form,
  });
  assert.ok([200, 201].includes(response.status), `Fixture upload failed (${response.status})`);
  const value = await response.json();
  return value[0];
}
const media = [];
let fixtureId;
try {
  const suffix = Date.now();
  for (const text of ["old", "new"]) {
    media.push(await upload(`library-${suffix}-${text}.html`, `<html><body>Fixture ${text} text ${suffix}</body></html>`, "text/html"));
  }
  // A tiny valid PNG belonging only to this fixture.
  media.push(await upload(`library-${suffix}.png`, Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
    "base64",
  ), "image/png"));
  const created = await request("/strapi/api/books?status=published&populate[submittedFiles][populate]=*", {
    method: "POST", headers: jsonHeaders, body: JSON.stringify({ data: {
      BookTitle: `Disposable library replacement check ${suffix}`,
      OriginalPublicationDate: "2026", contributerEmail: "fixture-owner@example.test",
      submittedFiles: { file: media[0].id, cover: media[2].id },
    } }),
  });
  assert.equal(created.status, 201, `Fixture creation failed (${created.status})`);
  const before = (await created.json()).data;
  fixtureId = before.documentId;
  const body = JSON.stringify({
    mediaId: media[1].id, expectedFileId: media[0].id, bookId: fixtureId, actorId: "disposable-integration-fixture",
  });
  const timestamp = String(Date.now());
  const signature = createHmac("sha256", secret).update(`neoalexandria-text\n${timestamp}\n${body}`).digest("hex");
  const replaced = await request(`/strapi/api/books/${fixtureId}/replace-text`, {
    method: "POST", headers: {
      "Content-Type": "application/json", "x-library-timestamp": timestamp, "x-library-signature": signature,
    }, body,
  });
  assert.equal(replaced.status, 200, `Fixture replacement failed (${replaced.status})`);
  const persisted = await request(`/strapi/api/books/${fixtureId}?populate[submittedFiles][populate]=*`);
  assert.equal(persisted.status, 200);
  const after = (await persisted.json()).data;
  assert.equal(after.id, before.id);
  assert.equal(after.documentId, before.documentId);
  assert.equal(after.BookTitle, before.BookTitle);
  assert.equal(after.contributerEmail, before.contributerEmail);
  assert.equal(after.publishedAt, before.publishedAt);
  assert.equal(after.submittedFiles.id, before.submittedFiles.id);
  assert.equal(after.submittedFiles.cover.id, before.submittedFiles.cover.id);
  assert.equal(after.submittedFiles.file.id, media[1].id);
  const oldMedia = await request(`/strapi/api/upload/files/${media[0].id}`, { headers: jsonHeaders });
  assert.equal(oldMedia.status, 200, "Previous media must remain");
  const content = await request(`/api/v1/books/${fixtureId}/content`);
  assert.equal(content.status, 200);
  assert.equal(content.headers.get("cache-control"), "no-store");
  assert.match(await content.text(), new RegExp(`Fixture new text ${suffix}`));
  console.log("Real development CMS replacement persisted with unchanged identity, component, cover, visibility and attribution; old media retained; public endpoint returned new text.");
} finally {
  if (fixtureId) {
    const response = await request(`/strapi/api/books/${fixtureId}`, { method: "DELETE", headers: jsonHeaders });
    assert.equal(response.status, 204, "Could not remove disposable test book");
  }
  for (const file of media) {
    const response = await request(`/strapi/api/upload/files/${file.id}`, { method: "DELETE", headers: jsonHeaders });
    assert.equal(response.status, 200, "Could not remove disposable test media");
  }
}
