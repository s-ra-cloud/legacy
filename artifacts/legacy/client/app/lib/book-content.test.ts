import assert from "node:assert/strict";
import test from "node:test";
import { fetchBookContent } from "./book-content.js";

test("book popup content uses the selected document ID and same-origin API", async () => {
  const request: typeof fetch = async (input, options) => {
    assert.equal(input, "/api/v1/books/selected-book/content");
    assert.equal(options?.credentials, "same-origin");
    return new Response("<p>Selected work</p>");
  };
  assert.equal(await fetchBookContent("selected-book", request), "<p>Selected work</p>");
});

test("document IDs cannot change the request path or inject a query", async () => {
  const request: typeof fetch = async (input) => {
    assert.equal(input, "/api/v1/books/book%2Fid%20%3F/content");
    return new Response("Text");
  };
  await fetchBookContent("book/id ?", request);
});

test("HTTP failures stay errors and do not fall back to a legacy media host", async () => {
  let requests = 0;
  const request: typeof fetch = async () => {
    requests++;
    return new Response("Missing", { status: 404 });
  };
  await assert.rejects(fetchBookContent("missing-book", request), /HTTP 404/);
  assert.equal(requests, 1);
});

test("missing identifiers fail before any request is sent", async () => {
  const request: typeof fetch = async () => { throw new Error("Should not fetch"); };
  await assert.rejects(fetchBookContent(" ", request), /document ID is required/);
});
