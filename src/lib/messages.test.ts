import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

import { NAV_GROUPS } from "./sidebar.ts";

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

/** Reads a dotted key out of a dictionary, or `undefined` if it is absent. */
function lookup(dictionary: Record<string, unknown>, key: string): unknown {
  return key
    .split(".")
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown> | undefined)?.[part],
      dictionary,
    );
}

test("every navigation label and destination has a message", () => {
  // The sidebar is built from `NAV_GROUPS`, so a group or a module that is added
  // there without a translation would render a raw key in the navigation — the
  // one place a user is guaranteed to be looking.
  const keys = NAV_GROUPS.flatMap((group) => [
    group.labelKey,
    ...group.items.map((item) => item.titleKey),
  ]);

  for (const locale of ["en", "ru"] as const) {
    const dictionary = read(locale);
    const missing = keys.filter(
      (key) => typeof lookup(dictionary, key) !== "string",
    );

    assert.deepEqual(
      missing,
      [],
      `${locale}.json is missing: ${missing.join(", ")}`,
    );
  }
});

test("the two completion percentages are named so neither reads as a bug", () => {
  // The Week review divides completed by what was already due by now; Analytics
  // divides completed by everything planned in its own window. The same week can
  // honestly show 75% on one screen and 50% on the other, so each has to say
  // which question it answers — a label *and* the basis it counts — and the two
  // must not collapse into one sentence that fits both.
  const keys = [
    "week.review.completion",
    "week.review.completionHint",
    "analytics.stats.completion",
    "analytics.stats.completionHint",
  ];

  for (const locale of ["en", "ru"] as const) {
    const dictionary = read(locale);
    const messages = keys.map((key) => lookup(dictionary, key));

    for (const [index, message] of messages.entries()) {
      assert.equal(
        typeof message,
        "string",
        `${locale}.json is missing ${keys[index]}`,
      );
      assert.ok(
        (message as string).trim().length > 0,
        `${locale}.json has an empty ${keys[index]}`,
      );
    }

    assert.notEqual(
      messages[0],
      messages[2],
      `${locale}: Week and Analytics need different completion labels`,
    );
    assert.notEqual(
      messages[1],
      messages[3],
      `${locale}: the two screens must state their own basis, not the same one`,
    );
  }
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
