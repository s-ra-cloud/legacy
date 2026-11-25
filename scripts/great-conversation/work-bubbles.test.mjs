import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {pathToFileURL} from "node:url";
import ts from "typescript";
import { denseWorks } from "./ui/dense-works-fixture.mjs";

const root = new URL("../../artifacts/legacy/client/app/",import.meta.url);
const temp = mkdtempSync(join(tmpdir(),"work-bubbles-"));
const source = readFileSync(new URL("components/pages/great-conversation/gc-work-bubble-layout.ts",root),"utf8");
writeFileSync(join(temp,"layout.mjs"),ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
const {buildWorkBubble,bubbleRows,BUBBLE_FONT,projectedBubbleLabel} = await import(pathToFileURL(join(temp,"layout.mjs")));
rmSync(temp,{recursive:true});
const snapshot = JSON.parse(readFileSync(new URL("lib/data/gc-wab.json",root),"utf8"));

test("all imported work titles remain complete inside finite, individually sized bubbles",()=>{
  for(const node of snapshot.works.nodes){
    const bubble=buildWorkBubble(node);
    assert.equal(bubble.titleLines.join("").replace(/[\s-]/gu,""),node.workTitle.replace(/[\s-]/gu,""),node.name);
    assert.equal(bubble.surname,bubble.surname.toUpperCase());
    assert.ok(Number.isFinite(bubble.radius)&&bubble.radius>=64);
    const rows=bubbleRows(bubble);
    for(const y of [...rows.surnameYs,...rows.titleYs,rows.yearY]) assert.ok(Math.abs(y)<bubble.radius,node.name);
    assert.ok(rows.surnameYs.at(-1)<rows.titleYs[0]&&rows.titleYs.at(-1)<rows.yearY);
  }
});

test("incoming references enlarge bubbles without shrinking text or allowing runaway hubs",()=>{
  const node={name:"Critique of Pure Reason",authorSurname:"Kant",publicationYear:"1781"};
  const base=buildWorkBubble(node);
  const once=buildWorkBubble(node,1);
  const often=buildWorkBubble(node,20);
  const hub=buildWorkBubble(node,1000000);
  assert.ok(base.radius<once.radius&&once.radius<often.radius&&often.radius<hub.radius);
  assert.ok(hub.radius<=2*base.radius);
  for(const bubble of [once,often,hub]){
    assert.deepEqual(bubble.titleLines,base.titleLines);
    assert.deepEqual(bubbleRows(bubble),bubbleRows(base));
  }
  for(const invalid of [-1,NaN,Infinity]) assert.equal(buildWorkBubble(node,invalid).radius,base.radius);
});

test("titles take priority over secondary metadata, missing metadata is explicit, and coauthors wrap",()=>{
  const label=projectedBubbleLabel(buildWorkBubble({name:"A readable title",authorSurname:"Kant"}),1);
  assert.ok(label.rows.find(row=>row.kind==="title").font>label.rows.find(row=>row.kind==="surname").font);
  const unknown=buildWorkBubble({name:"A title: preserving its subtitle"});
  assert.equal(unknown.surname,"UNKNOWN AUTHOR");
  assert.equal(unknown.year,"Year unknown");
  assert.equal(unknown.titleLines.join(" "),"A title: preserving its subtitle");
  const authors=buildWorkBubble({name:"Book",authorSurname:"Wittgenstein / Schopenhauer / Kierkegaard"});
  assert.ok(authors.surnameLines.length>1);
});

test("projected space, not global zoom, determines which complete titles fit", () => {
  const node = {name:"Philosophical Investigations",authorSurname:"Wittgenstein",publicationYear:"1953"};
  const small = buildWorkBubble(node);
  const large = buildWorkBubble(node,100);
  assert.equal(projectedBubbleLabel(large,0.4).mode, "full");
  assert.ok(["preview","author","outline"].includes(projectedBubbleLabel(small,0.3).mode));
  assert.ok(["title","full"].includes(projectedBubbleLabel(large,0.3).mode));
  assert.equal(projectedBubbleLabel(small,0.05).mode,"outline");
});

test("screen-space rows stay readable, complete and safely inside circular padding across zoom transitions", () => {
  const compact = s => s.replace(/[\s-]/gu,"");
  for(const node of [...snapshot.works.nodes,...denseWorks.nodes]) {
    const b=buildWorkBubble(node,20);
    for(const scale of [0.15,0.3,0.4,0.5,0.64,0.78,0.79,1,1.35]) {
      const label=projectedBubbleLabel(b,scale);
      const titles=label.rows.filter(row=>row.kind==="title");
      if(["full","title"].includes(label.mode)) {
        assert.equal(compact(titles.map(row=>row.text).join("")),compact(node.workTitle),node.name);
        assert.ok(titles.every(row=>row.font>=11));
      } else if(label.mode==="preview") {
        assert.ok(titles.every(row=>row.font>=11));
        const preview=compact(titles.map(row=>row.text).join(""));
        assert.ok(preview.endsWith("…"));
        assert.ok(compact(node.workTitle).startsWith(preview.slice(0,-1)),node.name);
      } else assert.equal(titles.length,0);
      for(const row of label.rows) {
        assert.ok(row.text.isWellFormed());
        assert.ok(Math.abs(row.y)+row.font*0.25<b.radius*scale);
      }
      if(scale>=0.79) assert.equal(label.mode,"full",node.name);
    }
  }
});

test("real repeated-author titles keep identifying previews rather than author-only circles", () => {
  for(const id of ["W-PI","W-PG","W-PR","W-OC","W-RFM","W-RPP","W-VB"]) {
    const node=snapshot.works.nodes.find(n=>n.id===id);
    assert.ok(node,id);
    const bubble=buildWorkBubble(node,5);
    for(const scale of [0.36,0.51]) {
      const label=projectedBubbleLabel(bubble,scale);
      assert.ok(["full","title","preview"].includes(label.mode),`${id} at ${scale}`);
      assert.ok(label.rows.some(row=>row.kind==="title"&&row.font>=11));
    }
    assert.equal(projectedBubbleLabel(bubble,1).mode,"full");
  }
  const short=projectedBubbleLabel(buildWorkBubble({name:"Macbeth"},5),0.36);
  assert.equal(short.rows.filter(r=>r.kind==="title").map(r=>r.text).join(" "),"Macbeth");
});

test("dense multilingual titles and coauthors retain every code point and ordered rows", () => {
  const compact = (s) => s.replace(/[\s-]/gu, "");
  for (const node of denseWorks.nodes) {
    const bubble = buildWorkBubble(node);
    assert.equal(compact(bubble.titleLines.join("")), compact(node.workTitle), node.id);
    assert.equal(compact(bubble.surnameLines.join("")), compact(node.authorSurname.toUpperCase()), node.id);
    // A wrap boundary must not split a surrogate pair into malformed text rows.
    for (const line of [...bubble.titleLines, ...bubble.surnameLines]) {
      assert.equal(line.isWellFormed(), true, `${node.id}: ${line}`);
    }
    const rows = bubbleRows(bubble);
    const ys = [...rows.surnameYs, ...rows.titleYs, rows.yearY];
    assert.ok(ys.every((y, i) => Number.isFinite(y) && Math.abs(y) < bubble.radius && (!i || y > ys[i - 1])), node.id);
    assert.ok(Number.isFinite(bubble.radius) && bubble.radius >= 64, node.id);
    if (node.authorSurname.length > 22) assert.ok(bubble.surnameLines.length > 1, node.id);
    assert.equal(bubble.year, node.publicationYear || "Year unknown");
  }
});
