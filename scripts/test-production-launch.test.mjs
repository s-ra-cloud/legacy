import assert from "node:assert/strict";
import {chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const source = readFileSync(path.join(root, "scripts/start-prod.sh"), "utf8");
const commands = [...source.matchAll(/\( watchdog (api|admin|client) 5 bash -c '([^']+)' \) &/g)];

test("production launches all built application services without a package manager", () => {
  assert.deepEqual(commands.map(m => m[1]), ["api", "admin", "client"]);
  for (const [, service, command] of commands) {
    assert.doesNotMatch(command, /\b(?:pnpm|npm|npx|corepack)\b/, service);
    assert.match(command, /\bexec\b/, `${service}: watchdog must own the server process`);
  }
});

for (const [, service, command] of commands) {
  test(`${service} launch preserves its working directory, port and injected environment offline`, () => {
    const fixture = mkdtempSync(path.join(tmpdir(), `legacy-launch-${service}-`));
    try {
      const bin = path.join(fixture, "bin");
      const cwd = path.join(fixture, "app/apps", service);
      mkdirSync(bin, {recursive:true});
      mkdirSync(path.join(cwd, "node_modules/.bin"), {recursive:true});
      const probe = `#!/usr/bin/env bash
printf '%s\\n' "$PWD" "$*" "\${API_PORT:-}" "\${PORT:-}" "\${API_HOST:-}" "\${HOST:-}" "$NODE_ENV" "$LAUNCH_TEST_INJECTED"
`;
      const executable = service === "api" ? path.join(bin, "node") : path.join(cwd, "node_modules/.bin/react-router-serve");
      writeFileSync(executable, probe);
      chmodSync(executable, 0o700);
      for (const manager of ["pnpm", "npm", "npx", "corepack"]) {
        const file = path.join(bin, manager);
        writeFileSync(file, "#!/usr/bin/env bash\necho 'Unexpected runtime package-manager call' >&2\nexit 92\n");
        chmodSync(file, 0o700);
      }
      const result = spawnSync("bash", ["-c", command], {
        encoding:"utf8", timeout:5000,
        env:{...process.env, PATH:`${bin}:${process.env.PATH}`, ROOT:fixture,
          NODE_ENV:"production", PORT:"24282", LAUNCH_TEST_INJECTED:"injected-value"},
      });
      assert.equal(result.status, 0, result.stderr);
      const rows = result.stdout.trim().split("\n");
      assert.equal(rows[0], cwd);
      assert.equal(rows[1], service === "api" ? "dist/node.js" : "./build/server/index.js");
      assert.equal(rows[service === "api" ? 2 : 3], {api:"3000",admin:"3001",client:"5173"}[service]);
      assert.equal(rows[service === "api" ? 4 : 5], "127.0.0.1");
      assert.equal(rows[6], "production");
      assert.equal(rows[7], "injected-value");
      if (service === "api") assert.equal(rows[3], "24282", "API_PORT must not replace the outer PORT");
    } finally {
      rmSync(fixture, {recursive:true,force:true});
    }
  });
}
