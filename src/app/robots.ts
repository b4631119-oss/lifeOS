import { routing } from "@/i18n/routing";
import { APP_ROUTES, SITE_URL } from "@/lib/seo";
import type { MetadataRoute } from "next";

/**
 * `robots.txt`.
 *
 * The public pages are open; the authenticated app is excluded in both of its
 * URL shapes, because those routes serve an empty shell to anyone without a
 * session — a crawler that indexed them would index nothing.
 */
export default function robots(): MetadataRoute.Robots {
  const appPaths = routing.locales.flatMap((locale) =>
    APP_ROUTES.map((path) => (locale === routing.defaultLocale ? path : `/${locale}${path}`)),
  );

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", ...appPaths],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
