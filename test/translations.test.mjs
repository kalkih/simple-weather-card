import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

const dir = new URL("../src/translations/", import.meta.url);
const load = (file) => JSON.parse(readFileSync(new URL(file, dir), "utf8"));

const keys = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([key, value]) =>
    typeof value === "object"
      ? keys(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );

const en = keys(load("en.json"));

for (const file of readdirSync(dir).filter((f) => f !== "en.json")) {
  test(`${file} has the same keys as en.json`, () => {
    const translated = keys(load(file));
    assert.deepEqual(
      en.filter((key) => !translated.includes(key)),
      [],
      "missing keys",
    );
    assert.deepEqual(
      translated.filter((key) => !en.includes(key)),
      [],
      "unknown keys",
    );
  });
}
