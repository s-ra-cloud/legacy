import { test, after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";

const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, "../..");
const client = resolve(root, "artifacts/legacy/client");
const temp = await mkdtemp(join(tmpdir(), "library-ui-"));
const output = await build({
  stdin: {
    contents: `
      export * from "./app/components/pages/library/contribute/book-text-pipeline";
      export { ReplaceTextForm } from "./app/components/pages/library/contribute/replace-text-form";
      export { ContributionForm } from "./app/components/pages/library/contribute/contribution-form";
      export { submitContribution } from "./app/components/pages/library/contribute/submit-contribution";
      export { default as JSZip } from "jszip";
    `, resolveDir: client, loader: "tsx",
  },
  bundle: true, write: false, platform: "node", format: "esm", jsx: "automatic",
  banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' },
  alias: { "~": resolve(client, "app") },
  plugins: [{
    name: "ui-boundaries",
    setup(b) {
      b.onResolve({ filter: /^(react(?:\/.*)?|react-dom(?:\/.*)?)$/ }, ({ path }) => ({
        path: require.resolve(path), external: true,
      }));
      b.onResolve({ filter: /^@repo\/shared\/env-client$/ }, ({ path }) => ({ path, namespace: "env" }));
      b.onLoad({ filter: /.*/, namespace: "env" }, () => ({
        contents: 'export const getStrapiMediaUrl = (url) => url?.startsWith("/") ? "https://library.test/strapi" + url : url;',
      }));
    },
  }],
});
const entry = join(temp, "entry.mjs");
await writeFile(entry, output.outputFiles[0].text);
const { prepareBookText, uploadBookText, processHtmlFileWithImages, extractZipFile, ReplaceTextForm, submitContribution, JSZip } =
  await import(pathToFileURL(entry));

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://library.test", pretendToBeVisual: true });
for (const [key, value] of Object.entries({
  window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true,
  FileList: dom.window.FileList,
})) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
// Node File supports Blob.text()/arrayBuffer(), unlike jsdom's File. Supply only
// the FileReader browser boundary used by the real, extracted HTML rewriter.
globalThis.FileReader = class {
  readAsText(file) {
    file.text().then((result) => this.onload?.({ target: { result } }), (error) => this.onerror?.(error));
  }
};
const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { act, createElement: h } = React;
const realFetch = globalThis.fetch;
let uploads = [], updates = [], createdBooks = [], failure = null;
globalThis.fetch = async (url, init) => {
  if (String(url).endsWith("/upload-media/upload")) {
    const file = init.body.get("files");
    if (failure === "upload") return Response.json({ error: "Synthetic upload failure" }, { status: 503 });
    uploads.push(file);
    return Response.json({ id: 100 + uploads.length, url: `/uploads/file-${uploads.length}.${file.type === "text/html" ? "html" : "png"}` });
  }
  if (String(url).endsWith("/text")) {
    updates.push(JSON.parse(init.body));
    if (failure === "update") return Response.json({ error: "Synthetic update failure" }, { status: 502 });
    return Response.json({ ok: true });
  }
  if (String(url) === "/api/v1/books") {
    const data = JSON.parse(init.body).data;
    createdBooks.push(data);
    return Response.json({ documentId: "newbook", ...data }, { status: 201 });
  }
  throw new Error(`Unexpected fetch ${url}`);
};
after(async () => {
  globalThis.fetch = realFetch;
  dom.window.close();
  await rm(temp, { recursive: true, force: true });
});

test("HTML validation rejects empty, unsupported and oversized files", async () => {
  for (const file of [
    new File([""], "empty.html"), new File(["<p>x</p>"], "book.pdf"),
    new File(["plain text"], "not-html.html"), new File([new Uint8Array(15 * 1024 * 1024 + 1)], "large.html"),
  ]) await assert.rejects(prepareBookText(file));
});

test("ZIP parsing handles nested and encoded images, repeated references and macOS metadata", async () => {
  const zip = new JSZip();
  zip.file("nested/book.htm", '<p>ZIP text</p><img src="images/a%20b.png"><img src="images/a%20b.png">');
  zip.file("nested/images/a b.png", new Uint8Array([1, 2, 3]));
  zip.file("__MACOSX/._book.html", "not html");
  const file = new File([await zip.generateAsync({ type: "uint8array" })], "book.zip");
  const selected = await prepareBookText(file);
  assert.equal(selected.htmlFile.type, "text/html");
  assert.equal(selected.images.length, 2);
  assert.ok(selected.images.every((image) => image.file?.name === "a b.png"));
  assert.equal(selected.images[0].file, selected.images[1].file);
});

test("expanded ZIP and entry-count limits reject compact archive bombs", async () => {
  const zip = new JSZip();
  zip.file("large.html", "x".repeat(15 * 1024 * 1024 + 1));
  const compact = new File([await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" })], "bomb.zip");
  await assert.rejects(prepareBookText(compact), /limit/);
  const many = new JSZip();
  for (let i = 0; i < 1001; i++) many.file(`${i}.txt`, "x");
  await assert.rejects(extractZipFile(new File([await many.generateAsync({ type: "uint8array" })], "many.zip")), /1,000/);
  const noHtml = new JSZip().file("image.png", "fake");
  await assert.rejects(prepareBookText(new File([await noHtml.generateAsync({ type: "uint8array" })], "empty.zip")), /No HTML/);
});

test("Word support headers never replace the main book, in either ZIP entry order", async () => {
  for (const supportFirst of [false, true]) {
    const zip = new JSZip();
    const main = () => zip.file("Tractatus.html", "<html><body><p>The world is all that is the case.</p><img src='Tractatus.fld/image001.png'></body></html>");
    const support = () => {
      zip.file("Tractatus.fld/header.html", "<html><body><p>Page header only</p></body></html>");
      zip.file("Tractatus.fld/footer.htm", "<p>Page footer only</p>");
      zip.file("Tractatus.fld/image001.png", new Uint8Array([1, 2, 3]));
      zip.file("__MACOSX/._Tractatus.html", "<p>Metadata</p>");
    };
    if (supportFirst) { support(); main(); } else { main(); support(); }
    const prepared = await prepareBookText(new File([await zip.generateAsync({ type: "uint8array" })], "Archive.zip"));
    assert.equal(prepared.htmlFile.name, "Tractatus.html");
    assert.match(await prepared.htmlFile.text(), /The world is all that is the case/);
    assert.equal(prepared.images[0].file.name, "image001.png");
  }
});

test("ambiguous books and support-only archives fail before upload", async () => {
  for (const folder of ["book.fld", "book_files", "book.files"]) {
    const zip = new JSZip().file(`${folder}/header.html`, "<p>Not a book</p>");
    await assert.rejects(prepareBookText(new File([await zip.generateAsync({ type: "uint8array" })], "support.zip")), /No HTML/);
  }
  for (const paths of [["first.html", "second.html"], ["index.html", "chapters/book.html"]]) {
    const zip = new JSZip();
    paths.forEach(path => zip.file(path, "<p>A book</p>"));
    await assert.rejects(prepareBookText(new File([await zip.generateAsync({ type: "uint8array" })], "ambiguous.zip")), /multiple main HTML/);
  }
  const standalone = await prepareBookText(new File(["<p>A legitimate book named header</p>"], "header.html"));
  assert.equal(standalone.htmlFile.name, "header.html");
});

test("shared creation/replacement upload preserves inline images and rewrites the selected local image", async () => {
  uploads = []; updates = []; failure = null;
  const html = new File(['<p>Text and footnote <a href="#ftn1">1</a></p><img src="data:image/png;base64,AQID"><img src="a.png"><table style="width:100%"><tr><td>Cell</td></tr></table>'], "book.html");
  const prepared = await prepareBookText(html);
  prepared.images[1].file = new File([new Uint8Array([1, 2, 3])], "a.png", { type: "image/png" });
  await uploadBookText(prepared.htmlFile, prepared.images, new Set([1]), prepared.zipData);
  assert.equal(uploads.length, 2);
  const rewritten = await uploads[1].text();
  assert.match(rewritten, /data:image\/png;base64,AQID/);
  assert.match(rewritten, /https:\/\/library.test\/strapi\/uploads\/file-1.png/);
  assert.match(rewritten, /width: fit-content/);
  assert.match(rewritten, /href="#ftn1"/);
  assert.equal(updates.length, 0, "The shared upload does not create or replace books itself");
});

test("missing selected images and failed media uploads abort before text switching", async () => {
  uploads = []; updates = [];
  const prepared = await prepareBookText(new File(['<p>Text</p><img src="missing.png">'], "book.html"));
  await assert.rejects(uploadBookText(prepared.htmlFile, prepared.images, new Set([0]), null), /Supply the image/);
  assert.equal(uploads.length, 0);
  failure = "upload";
  await assert.rejects(uploadBookText(prepared.htmlFile, prepared.images, new Set(), null), /Upload failed/);
  assert.equal(updates.length, 0);
  failure = null;
});

test("contribution creation still uploads HTML/ZIP images and cover, then creates exactly one attributed book", async () => {
  for (const useZip of [false, true]) {
    uploads = []; updates = []; createdBooks = []; failure = null;
    const zip = new JSZip().file("book.html", '<p>Contribution</p><img src="images/a.png">').file("images/a.png", new Uint8Array([1,2,3]));
    const file = useZip
      ? new File([await zip.generateAsync({ type: "uint8array" })], "contribution.zip")
      : new File(['<p>Contribution</p><img src="data:image/png;base64,AQID">'], "contribution.htm");
    const prepared = await prepareBookText(file);
    const user = { name: "Fixture contributor", email: "fixture@example.test" };
    await submitContribution({
      authorId: "author1", bookTitle: "New work", originalPublicationDate: "1900",
      htmlFile: prepared.htmlFile,
      coverImage: new File([new Uint8Array([1,2,3])], "cover.png", { type: "image/png" }),
      translatorFirstName: "First", translatorLastName: "Last", translatingDate: "1950",
    }, user, prepared.images, new Set(prepared.images.map((_, index) => index)), prepared.zipData);
    assert.equal(createdBooks.length, 1);
    assert.equal(updates.length, 0);
    assert.equal(uploads.length, useZip ? 3 : 2);
    assert.equal(createdBooks[0].BookTitle, "New work");
    assert.equal(createdBooks[0].contributerEmail, user.email);
    assert.equal(createdBooks[0].TranslatorName, "First Last");
    assert.deepEqual(createdBooks[0].author, { documentId: "author1" });
    assert.deepEqual(createdBooks[0].submittedFiles, {
      cover: [100 + uploads.length], file: [100 + uploads.length - 1],
    });
  }
});

const book = {
  documentId: "book1", BookTitle: "Another contributor's work", author: { fullName: "Test Author" },
  submittedFiles: { file: { id: 1 } },
};
async function mount() {
  let success = 0, cancelled = 0;
  const container = document.createElement("div");
  document.body.append(container);
  const renderer = createRoot(container);
  await act(async () => renderer.render(h(ReplaceTextForm, {
    book, onSuccess: async () => { success++; }, onCancel: () => { cancelled++; },
  })));
  const choose = async (file) => {
    const input = container.querySelector("#replaceTextFile");
    Object.defineProperty(input, "files", { configurable: true, value: [file] });
    await act(async () => input.dispatchEvent(new dom.window.Event("change", { bubbles: true })));
  };
  const confirm = async () => {
    const checkbox = [...container.querySelectorAll('input[type="checkbox"]')].at(-1);
    await act(async () => checkbox.click());
  };
  const submit = async () => {
    await act(async () => {
      container.querySelector("form").dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 30));
    });
  };
  return {
    container, choose, confirm, submit, success: () => success, cancelled: () => cancelled,
    close: async () => { await act(async () => renderer.unmount()); container.remove(); },
  };
}

test("replacement form requires confirmation, retains failed submissions and allows retry", async () => {
  uploads = []; updates = []; failure = null;
  const form = await mount();
  assert.match(form.container.textContent, /Another contributor's work/);
  assert.equal(form.container.querySelector('button[type="submit"]').disabled, true);
  await form.choose(new File(["<p>Replacement</p>"], "replacement.html"));
  assert.equal(form.container.querySelector('button[type="submit"]').disabled, true);
  await form.confirm();
  failure = "upload";
  await form.submit();
  assert.equal(updates.length, 0);
  assert.match(form.container.textContent, /selection are kept/);
  failure = "update";
  await form.submit();
  assert.equal(updates.length, 1);
  assert.equal(form.success(), 0);
  assert.match(form.container.textContent, /Synthetic update failure/);
  failure = null;
  await form.submit();
  assert.equal(form.success(), 1);
  assert.deepEqual(updates.at(-1), { mediaId: 102, expectedFileId: 1 });
  await form.close();
});

test("cancelling or choosing invalid input sends no uploads or replacement request", async () => {
  uploads = []; updates = [];
  const form = await mount();
  await form.choose(new File(["<p>New</p>"], "new.html"));
  await form.choose(new File(["invalid"], "bad.pdf"));
  assert.equal(form.container.querySelector('button[type="submit"]').disabled, true);
  assert.match(form.container.textContent, /Choose an HTML/);
  const cancel = [...form.container.querySelectorAll("button")].find((button) => button.textContent.trim() === "Cancel");
  await act(async () => cancel.click());
  assert.equal(form.cancelled(), 1);
  assert.equal(uploads.length, 0);
  assert.equal(updates.length, 0);
  await form.close();
});

test("pending replacement locks confirmation, file selection and cancellation until it finishes", async () => {
  uploads = []; updates = []; failure = null;
  const normalFetch = globalThis.fetch;
  let release;
  globalThis.fetch = (url, init) => String(url).endsWith("/upload-media/upload")
    ? new Promise((resolve) => { release = () => resolve(Response.json({ id: 42, url: "/uploads/new.html" })); })
    : normalFetch(url, init);
  const form = await mount();
  try {
    await form.choose(new File(["<p>Pending text</p>"], "pending.html"));
    await form.confirm();
    await form.submit();
    assert.equal(form.container.querySelector("#replaceTextFile").disabled, true);
    const cancel = [...form.container.querySelectorAll("button")].find((button) => button.textContent.trim() === "Cancel");
    assert.equal(cancel.disabled, true);
    assert.equal(form.container.querySelector('input[type="checkbox"]').disabled, true);
    await act(async () => {
      cancel.click();
      release();
      await new Promise((r) => setTimeout(r, 30));
    });
    assert.equal(form.cancelled(), 0);
    assert.equal(form.success(), 1);
  } finally {
    globalThis.fetch = normalFetch;
    await form.close();
  }
});
