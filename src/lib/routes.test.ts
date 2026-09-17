import assert from "node:assert/strict";
import { test } from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * The QA harness is not part of the product.
 *
 * It used to live at `src/app/[locale]/ui-qa/**`, where it was a real route
 * tree: `/ui-qa`, `/ui-qa/today`, `/ui-qa/week` … answered `200` in production
 * for both locales and rendered fixture data to anyone who found the URL. It is
 * now kept outside `src/app` (see `qa/README.md`) so it cannot become a route,
 * and these assertions are what keep it from creeping back in.
 *
 * They read the source tree rather than the build output on purpose: the check
 * has to be able to fail in a plain `npm test`, without a production build.
 */
const SRC = path.join(process.cwd(), "src");
const QA_SEGMENT = "ui-qa";

type Entry = { file: string; directory: boolean };

function walk(directory: string): Entry[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    const isDirectory = entry.isDirectory();

    return [{ file, directory: isDirectory }, ...(isDirectory ? walk(file) : [])];
  });
}

test("the application route tree has no QA harness segment", () => {
  const offenders = walk(path.join(SRC, "app"))
    .filter((entry) => entry.directory && entry.file.endsWith(QA_SEGMENT))
    .map((entry) => path.relative(process.cwd(), entry.file));

  assert.deepEqual(
    offenders,
    [],
    "a QA route segment is back under src/app — move it out to qa/ (see qa/README.md)",
  );
});

test("nothing in the application points at a QA route", () => {
  // Covers more than a stale href: the sitemap and robots.txt are built from
  // `src/lib/seo.ts`, so a path added to those lists would be found here too.
  const text = /\.(ts|tsx|json|css|md)$/;
  // The tests themselves quote the path they are forbidding, so they are left
  // out: what has to stay clean is the product — code, messages and styles.
  const offenders = walk(SRC)
    .filter(
      (entry) =>
        !entry.directory &&
        text.test(entry.file) &&
        !entry.file.endsWith(".test.ts"),
    )
    .filter((entry) => readFileSync(entry.file, "utf8").includes(`/${QA_SEGMENT}`))
    .map((entry) => path.relative(process.cwd(), entry.file));

  assert.deepEqual(
    offenders,
    [],
    "these files still reference /ui-qa, which is not a route any more",
  );
});
