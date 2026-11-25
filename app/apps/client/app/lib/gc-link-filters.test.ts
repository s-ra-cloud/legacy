import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_LINK_FILTERS,
  LINK_FILTER_OPTIONS,
  getLinkCategory,
  isConnectionVisible,
  type LinkFilters,
} from "./gc-link-filters.js";

const contributions = [
  { connectionType: "explicit" },
  { connectionType: "implicit", connectionSource: "archive" },
  { connectionType: "implicit", connectionSource: "scholar" },
  { connectionType: "implicit", connectionSource: "ai" },
] as const;

test("each connection maps to the correct category independently of agreement/opposition", () => {
  assert.deepEqual(contributions.map(getLinkCategory), LINK_FILTER_OPTIONS.map(option => option.value));
  assert.equal(getLinkCategory({ connectionType: "explicit", connectionSource: "archive" }), "explicit");
});

test("all 16 checkbox combinations independently include only the selected categories", () => {
  for (let mask = 0; mask < 16; mask++) {
    const filters = Object.fromEntries(
      LINK_FILTER_OPTIONS.map((option, index) => [option.value, Boolean(mask & (1 << index))]),
    ) as LinkFilters;
    contributions.forEach((contribution, index) => {
      assert.equal(isConnectionVisible(contribution, filters), Boolean(mask & (1 << index)));
    });
  }
});

test("all categories are enabled by default and existing contributions remain visible", () => {
  for (const contribution of [...contributions, { connectionType: "implicit" } as const]) {
    assert.equal(isConnectionVisible(contribution, DEFAULT_LINK_FILTERS), true);
  }
});

test("missing and null legacy implicit sources are not misrepresented as scholars or archives", () => {
  for (const contribution of [
    { connectionType: "implicit" } as const,
    { connectionType: "implicit", connectionSource: null } as const,
  ]) {
    assert.equal(getLinkCategory(contribution), null);
    for (const option of LINK_FILTER_OPTIONS.filter(option => option.value !== "explicit")) {
      assert.equal(isConnectionVisible(contribution, { ...DEFAULT_LINK_FILTERS, [option.value]: false }), false);
    }
    assert.equal(isConnectionVisible(contribution, { ...DEFAULT_LINK_FILTERS, explicit: false }), true);
  }
});
