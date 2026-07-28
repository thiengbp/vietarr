import test from "node:test";
import assert from "node:assert/strict";
import { classifyCountryGroups } from "../src/countries.mjs";

test("country codes take priority and preserve multiple production groups", () => {
  assert.deepEqual(
    classifyCountryGroups({ originCountries: ["KR", "US"], originalLanguage: "ko" }),
    ["korea", "western"]
  );
});

test("original language supplies a stable fallback for arr library items", () => {
  assert.deepEqual(classifyCountryGroups({ originalLanguage: { id: 10, name: "Chinese" } }), ["china"]);
  assert.deepEqual(classifyCountryGroups({ originalLanguage: "vi" }), ["vietnam"]);
  assert.deepEqual(classifyCountryGroups({ originalLanguage: "Hindi" }), ["other"]);
});
