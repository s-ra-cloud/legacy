import assert from "node:assert/strict";
import test from "node:test";
import { gcContributionSchema } from "./output.js";
import { gcContributionDataSchema } from "./input.js";
import { contributionsSchema } from "../../books/schema/output.js";

for (const [name, schema] of [
  ["contribution response", gcContributionSchema.pick({ connectionType: true, connectionSource: true })],
  ["nested book contribution", contributionsSchema.pick({ connectionType: true, connectionSource: true })],
] as const) {
  const sourceSchema = schema;

  test(`${name} preserves all three source tags`, () => {
    for (const connectionSource of ["archive", "scholar", "ai"] as const) {
      assert.deepEqual(sourceSchema.parse({ connectionType: "implicit", connectionSource }), {
        connectionType: "implicit", connectionSource,
      });
    }
  });

  test(`${name} accepts historical records without source metadata`, () => {
    assert.deepEqual(sourceSchema.parse({ connectionType: "implicit" }), { connectionType: "implicit" });
    assert.equal(sourceSchema.parse({ connectionType: "implicit", connectionSource: null }).connectionSource, null);
    assert.equal(sourceSchema.safeParse({ connectionType: "implicit", connectionSource: "invented" }).success, false);
  });
}

test("public contribution input cannot claim archive or AI provenance", () => {
  assert.equal("connectionSource" in gcContributionDataSchema.innerType().shape, false);
});
