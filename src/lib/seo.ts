import { routing, type Locale } from "@/i18n/routing";

/**
 * Where the app is served from.
 *
 * Absolute URLs are not optional for canonical, `hreflang`, Open Graph and the
 * sitemap, so the base has to come from configuration rather than from the
 * request. `NEXT_PUBLIC_SITE_URL` overrides it (previews, self-hosting); the
 * default is the deployment the project documents as its live demo.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://os-life-one.vercel.app"
).replace(/\/+$/, "");

/**
 * The app's own routes, i.e. everything behind the Google sign-in.
 *
 * They are real pages, but every one of them renders an authenticated shell
 * whose content arrives after a Firebase round trip — a crawler gets an empty
 * document. Indexing that is worse than not indexing it, so these are excluded
 * in `robots.txt` and carry `noindex` in their own metadata.
 */
export const APP_ROUTES = [
  "/today",
  "/week",
  "/schedule",
  "/habits",
  "/goals",
  "/analytics",
  "/notes",
  "/profile",
] as const;

/**
 * Pages a signed-out visitor (and therefore a crawler) can actually read.
 *
 * Deliberately short: the sitemap lists the pages that exist and say something,
 * not every route the router can answer.
 */
export const PUBLIC_ROUTES = ["/", "/signin", "/signup"] as const;

/**
 * The URL of a path in one locale, honouring the `as-needed` prefix rule
 * (English is prefix-free, other locales are prefixed).
 */
export function localizedPath(locale: Locale, path: string): string {
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  if (path === "/") return prefix === "" ? "/" : `${prefix}`;

  return `${prefix}${path}`;
}

/** The same path in every locale plus `x-default` — what `hreflang` needs. */
export function languageAlternates(path: string): Record<string, string> {
  const alternates: Record<string, string> = {};

  for (const locale of routing.locales) {
    alternates[locale] = localizedPath(locale, path);
  }
  // The default locale is what an unknown-language visitor should be served.
  alternates["x-default"] = localizedPath(routing.defaultLocale, path);

  return alternates;
}

/** The `og:locale` value for a locale (`ru` → `ru_RU`). */
export function openGraphLocale(locale: Locale): string {
  return locale === "ru" ? "ru_RU" : "en_US";
}

/** `hreflang`/OG values use the region-less language tag the routing defines. */
export function toLocale(value: string): Locale {
  return (routing.locales as readonly string[]).includes(value)
    ? (value as Locale)
    : routing.defaultLocale;
}
