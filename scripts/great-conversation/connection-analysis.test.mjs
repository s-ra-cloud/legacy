import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { JSDOM } from "jsdom";

const root = new URL("../../", import.meta.url).pathname;
const require = createRequire(import.meta.url);
const result = await build({
  stdin: { resolveDir: root, loader: "tsx", contents: `
    import React from "react";
    import { renderToStaticMarkup } from "react-dom/server";
    import { ConnectionAnalysisDetails, ConnectionAnalysisFields } from "./artifacts/legacy/client/app/components/pages/great-conversation/book-content/connection-analysis";
    export const details = value => renderToStaticMarkup(<ConnectionAnalysisDetails value={value} />);
    export const fields = value => renderToStaticMarkup(<ConnectionAnalysisFields value={value} onChange={() => {}} />);
  ` },
  bundle: true, write: false, platform: "node", format: "cjs", jsx: "automatic",
  alias: { "~": `${root}artifacts/legacy/client/app` },
});
const module = { exports: {} };
new Function("require", "module", "exports", result.outputFiles[0].text)(require, module, module.exports);
const { details, fields } = module.exports;
test("readers distinguish every stance, historical ambiguity and three certainty states", () => {
  for (const [value, label] of [["agreement", "Agreement"], ["opposition", "Disagreement"],
    ["neutral", "Neutral"], ["mixed", "Mixed"], [null, "Not assessed"],
    ["neutral / unsure", "Neutral / unsure (historical, ambiguous)"]]) {
    assert.ok(details({ connectionNature: value }).includes(label));
  }
  assert.match(details({}), /Not recorded/);
  assert.match(details({ connectionUncertain: null }), /Not recorded/);
  assert.match(details({ connectionUncertain: false }), /Not marked uncertain/);
  assert.match(details({ connectionUncertain: true }), /Uncertain/);
});
test("citations are escaped text; only HTTP(S) URLs become links and no remote lookup occurs", () => {
  for (const citation of ["Edition 1, p. 42", "javascript:alert(1)", "data:text/html,test",
    '<img src=x onerror="alert(1)">', "file:///etc/passwd"]) {
    const dom = new JSDOM(details({ supportingReference: citation, originComment: "<script>bad()</script>",
      explainConnection: "Historical explanation preserved" }));
    assert.equal(dom.window.document.querySelector("a"), null);
    assert.equal(dom.window.document.querySelector("script, img"), null);
    assert.ok(dom.window.document.body.textContent.includes(citation));
    assert.ok(dom.window.document.body.textContent.includes("Historical explanation preserved"));
    dom.window.close();
  }
  const dom = new JSDOM(details({ supportingReference: "https://example.org/source?a=1&b=2" }));
  const link = dom.window.document.querySelector("a");
  assert.equal(link.href, "https://example.org/source?a=1&b=2");
  assert.equal(link.rel, "noopener noreferrer");
  dom.window.close();
});
test("new analysis has no assessed position, four positions, independent uncertainty and one general comment", () => {
  const dom = new JSDOM(fields({ connectionUncertain: false }));
  const doc = dom.window.document;
  assert.deepEqual([...doc.querySelectorAll("option")].map(o => o.textContent),
    ["Not assessed", "Agreement", "Disagreement", "Neutral", "Mixed"]);
  assert.equal(doc.querySelector("select").required, false);
  assert.equal(doc.querySelector("select").value, "");
  assert.equal(doc.querySelector('input[type="checkbox"]').checked, false);
  assert.equal(doc.querySelectorAll("textarea").length, 3);
  assert.match(doc.body.textContent, /not an author's entire attitude/);
  assert.match(doc.body.textContent, /unchecked means/);
  assert.match(doc.body.textContent, /Neither a citation nor certainty confers human verification/);
  dom.window.close();
});
