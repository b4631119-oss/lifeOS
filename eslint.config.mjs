import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { defineConfig, globalIgnores } from "eslint/config";

// Enforces the AGENTS.md i18n rule: navigation primitives must come from
// `@/i18n/navigation` (next-intl's `createNavigation(routing)`), because plain
// `next/link` & friends drop the locale prefix — a link from `/ru/...` would
// land on the English page.
const localeAwareNavHint =
  'Import navigation primitives from "@/i18n/navigation" instead — next/link and next/navigation drop the locale prefix, so links from /ru/... land on the English pages (see AGENTS.md → Internationalization).';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "next/link",
              message: localeAwareNavHint,
            },
            {
              name: "next/navigation",
              // `notFound` is deliberately absent: it is a control-flow API
              // rather than a navigation primitive, and next-intl ships no
              // locale-aware equivalent. `useParams`/`useSearchParams` stay
              // allowed too — they read the current URL instead of building one.
              importNames: ["useRouter", "usePathname", "redirect"],
              message: localeAwareNavHint,
            },
          ],
        },
      ],
    },
  },
  // No baselined exceptions: the lint debt that used to be downgraded here
  // (theme/sidebar state in effects, an `any` module shim) has been fixed, so
  // the `prebuild` gate now runs the config as written — every rule below is an
  // error for every file.
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The archived QA harness (`qa/`): a local tool that is not part of the
    // product, so it must not be able to fail the `prebuild` gate. When it is
    // copied back into `src/app` for a QA pass, the rules apply again.
    "qa/**",
  ]),
]);

export default eslintConfig;
