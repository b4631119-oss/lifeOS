import { routing } from "@/i18n/routing";
import { PUBLIC_ROUTES, SITE_URL, languageAlternates, localizedPath } from "@/lib/seo";
import type { MetadataRoute } from "next";

/**
 * `sitemap.xml`.
 *
 * One entry per public page, with the other locale linked as an alternate, so
 * the RU and EN versions are understood as translations of each other instead
 * of competing duplicates. The authenticated routes are not listed: they are
 * private, and a crawler has nothing to read there.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PUBLIC_ROUTES.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: `${SITE_URL}${localizedPath(locale, path)}`,
      lastModified,
      changeFrequency: path === "/" ? ("weekly" as const) : ("monthly" as const),
      priority: path === "/" ? 1 : 0.5,
      alternates: { languages: languageAlternates(path) },
    })),
  );
}
