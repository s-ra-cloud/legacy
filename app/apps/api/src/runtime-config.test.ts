import assert from "node:assert/strict";
import test from "node:test";
import { getRuntimeConfig, verifyAuthSchema } from "./runtime-config.js";

test("API stays internal and does not take nginx's PORT", () => {
  assert.deepEqual(getRuntimeConfig({ PORT: "5000" }), {
    hostname: "127.0.0.1",
    port: 3000,
  });
});

test("allows an explicit API listener for isolated tests", () => {
  assert.deepEqual(getRuntimeConfig({ API_HOST: "127.0.0.1", API_PORT: "3002" }), {
    hostname: "127.0.0.1",
    port: 3002,
  });
});

test("rejects invalid ports rather than silently choosing another", () => {
  for (const API_PORT of ["", "0", "65536", "3.5", "invalid"]) {
    assert.throws(() => getRuntimeConfig({ API_PORT }), /API_PORT/);
  }
});

test("schema preflight awaits its read-only probe", async () => {
  let checked = false;
  await verifyAuthSchema(async () => { checked = true; });
  assert.equal(checked, true);
});

test("schema preflight fails closed without leaking driver details", async () => {
  await assert.rejects(
    verifyAuthSchema(async () => { throw new Error("private driver details"); }),
    (error: Error) => {
      assert.match(error.message, /Publish schema review/);
      assert.match(error.message, /No migration was attempted/);
      assert.doesNotMatch(error.message, /private driver details/);
      return true;
    },
  );
});
