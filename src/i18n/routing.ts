import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ru"],
  defaultLocale: "en",
  // Non-default locales get a path prefix (`/ru/...`) so the active language is
  // visible in the URL and shareable. English stays prefix-free.
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
