import assert from "node:assert/strict";
import { test } from "node:test";

import { nextVersion } from "../.github/scripts/next-version.mjs";

const TAGS = [
  "v2.9.0",
  "v2.9.0-beta-1",
  "v2.10.0",
  "v2.3.0-beta-1-UIX",
  "v2.8.2-beta",
  "v1.0.6",
];

test("bumps the latest stable version", () => {
  assert.deepEqual(nextVersion(TAGS, "patch", false), {
    tag: "v2.10.1",
    version: "2.10.1",
    previous: "v2.10.0",
  });
  assert.equal(nextVersion(TAGS, "minor", false).tag, "v2.11.0");
  assert.equal(nextVersion(TAGS, "major", false).tag, "v3.0.0");
});

test("sorts versions numerically, not alphabetically", () => {
  assert.equal(
    nextVersion(["v2.9.0", "v2.10.0", "v2.2.0"], "patch", false).tag,
    "v2.10.1",
  );
});

test("counts betas up and generates notes from the last beta", () => {
  assert.deepEqual(nextVersion(TAGS, "minor", true), {
    tag: "v2.11.0-beta-1",
    version: "2.11.0-beta-1",
    previous: "v2.10.0",
  });
  const tags = [...TAGS, "v2.11.0-beta-1", "v2.11.0-beta-2"];
  assert.deepEqual(nextVersion(tags, "minor", true), {
    tag: "v2.11.0-beta-3",
    version: "2.11.0-beta-3",
    previous: "v2.11.0-beta-2",
  });
});

test("a stable release after betas generates notes from the last stable", () => {
  const tags = [...TAGS, "v2.11.0-beta-1", "v2.11.0-beta-2"];
  assert.deepEqual(nextVersion(tags, "minor", false), {
    tag: "v2.11.0",
    version: "2.11.0",
    previous: "v2.10.0",
  });
});

test("rejects unknown bumps", () => {
  assert.throws(() => nextVersion(TAGS, "huge", false), /Unknown bump/);
});

test("works without any tags", () => {
  assert.deepEqual(nextVersion([], "minor", false), {
    tag: "v0.1.0",
    version: "0.1.0",
    previous: undefined,
  });
});
