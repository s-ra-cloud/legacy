import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, chmodSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("clean source includes the admin React Router Vite configuration", () => {
  const source = readFileSync(path.join(root, "app/apps/admin/vite.config.ts"), "utf8");
  assert.match(source, /reactRouter\(\)/);
});

function simulateBuild(failCommand = "", teamSync = false) {
  const dir = mkdtempSync(path.join(tmpdir(), "release-safety-"));
  const log = path.join(dir, "commands");
  try {
    for (const command of ["pnpm", "npm", "psql"]) {
      const file = path.join(dir, command);
      writeFileSync(file, `#!/usr/bin/env bash
echo "$(basename "$0") $*" >> "$RELEASE_TEST_LOG"
if [[ -n "$RELEASE_FAIL_COMMAND" && "$*" == *"$RELEASE_FAIL_COMMAND"* ]]; then exit 17; fi
`);
      chmodSync(file, 0o700);
    }
    const result = spawnSync("bash", [path.join(root, "scripts/build-prod.sh")], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${dir}:${process.env.PATH}`,
        RELEASE_TEST_LOG: log,
        RELEASE_FAIL_COMMAND: failCommand,
        STRAPI_SYNC_TEAM: teamSync ? "1" : "",
        DATABASE_URL: teamSync ? "test-placeholder" : "",
      },
    });
    return { status: result.status, output: result.stdout + result.stderr, commands: readFileSync(log, "utf8") };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("default release builds the API without schema/content/permission mutations", () => {
  const result = simulateBuild();
  assert.equal(result.status, 0, result.output);
  assert.match(result.commands, /pnpm --filter @repo\/api build/);
  assert.doesNotMatch(result.commands, /psql|db push|db execute|migrate|accept-data-loss/);
});

test("native rebuild and API build failures abort the release", () => {
  for (const command of ["rebuild prisma", "--filter @repo/api build"]) {
    const result = simulateBuild(command);
    assert.notEqual(result.status, 0);
    assert.doesNotMatch(result.commands, /npm run build/);
    assert.doesNotMatch(result.output, /Build complete/);
  }
});

test("explicit team sync remains opt-in and fails closed", () => {
  const result = simulateBuild("ON_ERROR_STOP", true);
  assert.notEqual(result.status, 0);
  assert.match(result.commands, /psql .*ON_ERROR_STOP=1.*sync-team-prod\.sql/);
  assert.match(result.output, /Strapi Team sync failed/);
  assert.doesNotMatch(result.output, /Build complete/);
});

test("production startup does not modify accounts or permissions", () => {
  const source = readFileSync(path.join(root, "scripts/start-prod.sh"), "utf8");
  assert.doesNotMatch(source, /psql|prisma (?:db push|migrate)|UPDATE users|up_permissions/);
  assert.match(source, /API_HOST=127\.0\.0\.1 API_PORT=3000/);
});

test("Strapi entry redirect cannot expose nginx's internal host port or scheme", () => {
  const source = readFileSync(path.join(root, "nginx.replit.conf"), "utf8");
  const location = source.match(/location\s*=\s*\/strapi\s*\{([^}]+)\}/)?.[1];
  assert.ok(location, "Bare Strapi entry route must exist");
  assert.match(location, /absolute_redirect\s+off\s*;/);
  assert.match(location, /return\s+302\s+\/strapi\/admin\s*;/);
});
