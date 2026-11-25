import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,writeFileSync,chmodSync,readFileSync,existsSync,rmSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {tmpdir} from "node:os";
import path from "node:path";

const root=path.resolve(import.meta.dirname,"..");
function simulateSetup(environment="development",fail=false){
  const dir=mkdtempSync(path.join(tmpdir(),"gc-schema-setup-"));
  const log=path.join(dir,"commands");
  try {
    const pm=path.join(dir,"pnpm");
    writeFileSync(pm,`#!/usr/bin/env bash
echo "$*" >> "$SETUP_TEST_LOG"
if [[ "$SETUP_TEST_FAIL" == "1" && "$*" == *"prisma db execute"* ]]; then exit 19; fi
`);
    chmodSync(pm,0o700);
    const result=spawnSync("bash",[path.join(root,"scripts/post-merge.sh")],{
      cwd:root,encoding:"utf8",timeout:5000,
      env:{...process.env,PATH:`${dir}:${process.env.PATH}`,NODE_ENV:environment,SETUP_TEST_LOG:log,SETUP_TEST_FAIL:fail?"1":"0"},
    });
    return {...result,commands:existsSync(log)?readFileSync(log,"utf8"):""};
  } finally {rmSync(dir,{recursive:true,force:true});}
}

test("post-merge creates verification storage through its existing additive migration",()=>{
  const result=simulateSetup();
  assert.equal(result.status,0,result.stderr);
  assert.match(result.commands,/--filter @repo\/db exec prisma db execute --schema prisma\/schema.prisma --file prisma\/migrations\/20261111000000_gc_human_verification\/migration.sql/);
  assert.match(result.commands,/--file prisma\/migrations\/20261112000000_gc_verification_amendments\/migration.sql/);
  assert.match(result.commands,/--file prisma\/migrations\/20261119000000_gc_partial_references\/migration.sql/);
  assert.match(result.commands,/--file prisma\/migrations\/20261120000000_gc_reference_amendments\/migration.sql/);
  assert.doesNotMatch(result.commands,/db push|migrate reset|accept-data-loss/);
  const migration=readFileSync(path.join(root,"app/packages/db/prisma/migrations/20261111000000_gc_human_verification/migration.sql"),"utf8");
  assert.match(migration,/CREATE TABLE IF NOT EXISTS gc_verification_entities/);
  assert.match(migration,/CREATE TABLE IF NOT EXISTS gc_verification_revisions/);
  assert.doesNotMatch(migration,/\b(?:DROP TABLE|TRUNCATE|DELETE FROM|UPDATE users)\b/i);
  const amendments=readFileSync(path.join(root,"app/packages/db/prisma/migrations/20261112000000_gc_verification_amendments/migration.sql"),"utf8");
  assert.match(amendments,/ADD COLUMN IF NOT EXISTS submission_id/);
  assert.doesNotMatch(amendments,/\b(?:DROP|TRUNCATE|DELETE|UPDATE)\b/i);
});

test("failed development migration aborts setup instead of reporting success",()=>{
  const result=simulateSetup("development",true);
  assert.notEqual(result.status,0);
  assert.doesNotMatch(result.stdout,/Post-merge setup complete/);
});

test("post-merge cannot run schema changes in production",()=>{
  const result=simulateSetup("production");
  assert.notEqual(result.status,0);
  assert.equal(result.commands,"");
  assert.match(result.stderr,/development-only/);
});
