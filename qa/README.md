# QA harness (not part of the product)

This folder holds the visual/responsive QA harness that used to live at
`src/app/[locale]/ui-qa/**`, where it was a real route tree: every screen
answered `200` in production, was prerendered for both locales, and rendered
fake product data (fixtures) to anyone who found the URL.

It is kept here instead, deliberately outside `src/app`, so it **cannot** become
a route: no production build, no sitemap entry, no bundle. Nothing in `src/`
imports from this folder: it is a local tool that ships with the repository so a
QA pass does not have to rebuild it, but no release contains it.

It is also outside the release gates (`tsconfig.json` excludes `qa`, and
`eslint.config.mjs` ignores it), so this folder can never fail `npm run build`,
`npx tsc --noEmit` or `npm run lint` over a file the release does not ship. The
trade-off is that it stops being type-checked while it sits here: after copying
it back into `src/app` for a QA pass, run those commands before trusting it.

## Running it

The harness is written against the app's own components (`@/components/...`,
`../Shell`, `../fixtures`), so it keeps compiling and linting where it is, but
Next only routes files under `src/app`. To use it for a QA pass:

```bash
mkdir -p "src/app/[locale]"
cp -r qa/ui-qa "src/app/[locale]/ui-qa"
npm run dev          # then open /ui-qa (or /ru/ui-qa)
```

When the pass is over, remove it again and confirm the route tree is clean:

```bash
rm -rf "src/app/[locale]/ui-qa"
npm run build        # the route list must not contain /ui-qa
```

## What is inside

| Path                  | What it shows                                                          |
| --------------------- | ---------------------------------------------------------------------- |
| `ui-qa/page.tsx`      | Index: every screen in iframes at 360–1440px, plus fixed-width frames.  |
| `ui-qa/today/`        | The Today composition, at document level (real media queries).          |
| `ui-qa/today/states/` | Today's row states (long titles, every status, highlighted row).        |
| `ui-qa/week/`         | The Week composition, at document level.                                |
| `ui-qa/habits/`       | The habits list with a populated history grid.                          |
| `ui-qa/analytics/`    | The analytics report built from fixtures.                               |
| `ui-qa/analytics/states/` | The analytics empty/degenerate states.                              |
| `ui-qa/Shell.tsx`     | The real `AdminLayout` with every provider, minus the auth guard.       |
| `ui-qa/fixtures.ts`   | The sample data: awkward titles, mixed languages, every status.          |

Screens live behind Google sign-in, which is why the harness renders the
components from fixtures rather than from Firestore. Anything that needs a real
account (auth, Firestore reads/writes, autosave, security rules, real touch,
screen readers) is **not** covered by it.
