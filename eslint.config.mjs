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
  {
    // TODO(lint-debt): pre-existing template violations, baselined so the
    // `prebuild` lint gate can block *new* problems without freezing the build.
    // The two rules are downgraded for these files only — never project-wide —
    // so this list *is* the debt. Drop a file from it once its issue is fixed.
    files: [
      "jsvectormap.d.ts",
      "src/context/ThemeContext.tsx",
      "src/context/SidebarContext.tsx",
      "src/layout/AppSidebar.tsx",
      "src/components/calendar/CalendarEventModal.tsx",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
