import type { MetadataRoute } from "next";

/**
 * Web app manifest — what makes LifeOS installable on a phone or desktop.
 *
 * Lives at the root of `app` because that is where Next.js requires metadata
 * routes to be (it is not a page, so the `[locale]` rule for routes does not
 * apply to it). Next serves it at `/manifest.webmanifest` and injects the
 * `<link rel="manifest">` into every page itself, so no head tags are needed.
 *
 * The strings are intentionally not localized: `name`/`short_name` are the
 * product name ("LifeOS") in both supported languages, and only `description`
 * would ever differ — too little to justify a per-locale manifest route.
 * The icons come from `scripts/generate-pwa-icons.py`.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "LifeOS",
    short_name: "LifeOS",
    description:
      "Personal life management system — daily planning, habit tracking, goals and notes.",
    lang: "en",
    // Locale is decided by the middleware from the cookie/Accept-Language on
    // first launch, exactly as it is for a normal visit.
    start_url: "/",
    scope: "/",
    display: "standalone",
    theme_color: "#465FFF",
    background_color: "#ffffff",
    icons: [
      {
        src: "/pwa/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        // Full-bleed variants for platforms that crop the icon to their own
        // shape (Android adaptive icons).
        src: "/pwa/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/pwa/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
