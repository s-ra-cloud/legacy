import { test, after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const client = resolve(import.meta.dirname, "../../artifacts/legacy/client");
const temp = await mkdtemp(join(tmpdir(), "author-presentation-"));
after(() => rm(temp, { recursive: true, force: true }));
const output = await build({
  stdin: {
    contents: `
      export { Books } from "./app/components/pages/library/author-data/books-list";
      export { Expert } from "./app/components/pages/library/author-data/author-expert";
      export { MemoryRouter } from "react-router";
    `,
    resolveDir: client, loader: "tsx",
  },
  bundle: true, write: false, platform: "node", format: "esm", jsx: "automatic",
  alias: { "~": resolve(client, "app") },
  banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' },
  plugins: [{
    name: "shared-react",
    setup(b) {
      b.onResolve({ filter: /^(react(?:\/.*)?|react-dom(?:\/.*)?)$/ }, ({ path }) => ({
        path: require.resolve(path), external: true,
      }));
    },
  }],
});
const entry = join(temp, "entry.mjs");
await writeFile(entry, output.outputFiles[0].text);
const { Books, Expert, MemoryRouter } = await import(pathToFileURL(entry));
const author = {
  fullName: "Example Philosopher", birthDeath: "1700–1780",
  picture: { url: "https://example.test/philosopher-portrait.jpg" },
  books: [{ id: 1, documentId: "work-one", BookTitle: "An Existing Work" }],
};
const renderBooks = props => renderToStaticMarkup(h(MemoryRouter, null, h(Books, {
  res: author, isLoading: false, id: "author-one", ...props,
})));

test("NeoAlexandria removes philosopher portraits without losing names, dates or work links", async () => {
  const route = await readFile(join(client, "app/routes/library/author-library.tsx"), "utf8");
  assert.match(route, /showPortrait=\{false\}/);
  const html = renderBooks({ showPortrait: false });
  assert.doesNotMatch(html, /philosopher-portrait\.jpg|<img\b/);
  assert.match(html, /Example Philosopher/);
  assert.match(html, /1700–1780/);
  assert.match(html, /An Existing Work/);
  assert.match(html, /href="[^"]*work-one/);
  assert.match(renderBooks({}), /philosopher-portrait\.jpg/, "Other callers retain their existing portraits");
});

test("portrait-free loading does not reserve an empty portrait column", () => {
  assert.doesNotMatch(renderBooks({ isLoading: true, showPortrait: false }), /md:w-56/);
  assert.match(renderBooks({ isLoading: true }), /md:w-56/);
});

test("philosopher pages render no supplied or fallback videos and retain expert biographies", () => {
  const expert = { name: "Research Expert", affiliation: "Existing Institution", description: "Existing expert biography." };
  for (const youtubeLink of [undefined, "https://www.youtube.com/embed/example"]) {
    const html = renderToStaticMarkup(h(Expert, { res: { ...author, youtubeLink, expert }, isLoading: false }));
    assert.doesNotMatch(html, /<iframe\b|<video\b|youtube|Video lecture/i);
    assert.match(html, /Research Expert/);
    assert.match(html, /Existing Institution/);
    assert.match(html, /Existing expert biography/);
  }
  assert.equal(renderToStaticMarkup(h(Expert, { res: author, isLoading: false })), "");
});
