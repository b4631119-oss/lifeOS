import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * The two dictionaries are hand-written, so they drift. This test is the only
 * thing that notices: every leaf key of `en.json` must exist in `ru.json` and
 * vice versa, so a page can never fall back to a raw key in one locale only.
 * Values are free to differ (they are translations), and nested namespaces
 * (`analytics.empty`) are compared as dotted paths.
 */
function read(locale: "en" | "ru"): Record<string, unknown> {
  const file = path.join(process.cwd(), "src", "messages", `${locale}.json`);
  return JSON.parse(readFileSync(file, "utf8"));
}

function leafKeys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object") return [prefix];

  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, child]) => leafKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

test("the Russian and English dictionaries hold exactly the same keys", () => {
  const english = leafKeys(read("en")).sort();
  const russian = leafKeys(read("ru")).sort();

  assert.deepEqual(
    english.filter((key) => !russian.includes(key)),
    [],
    "keys present in en.json but missing from ru.json",
  );
  assert.deepEqual(
    russian.filter((key) => !english.includes(key)),
    [],
    "keys present in ru.json but missing from en.json",
  );
});

test("no message is left empty in either language", () => {
  for (const locale of ["en", "ru"] as const) {
    const dictionary = read(locale);
    const empty = leafKeys(dictionary).filter((key) => {
      const value = key
        .split(".")
        .reduce<unknown>(
          (node, part) => (node as Record<string, unknown>)[part],
          dictionary,
        );
      return typeof value === "string" && value.trim() === "";
    });

    assert.deepEqual(empty, [], `${locale}.json has empty messages`);
  }
});
