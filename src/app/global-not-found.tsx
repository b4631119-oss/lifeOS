/* eslint-disable @next/next/no-html-link-for-pages -- This page renders outside
   the `[locale]` tree: there is no intl context, so `@/i18n/navigation`'s Link
   throws here (verified — it turned this page into a 500), and `next/link` is
   banned project-wide by our own rule. A plain anchor is what is left, and a
   full page load on a 404 is harmless. */
import { themeInitScript } from "@/lib/theme";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
// Imported by hand on purpose: this page bypasses every layout, so nothing else
// would pull the stylesheet (or the Tailwind theme tokens it defines) in.
import "./globals.css";

/**
 * The 404 for URLs that match no route at all.
 *
 * `[locale]/not-found.tsx` cannot cover this case: it renders *inside* the
 * `[locale]` layout, and an unmatched URL never reaches that segment's tree, so
 * Next would show its built-in English error screen. `global-not-found` is
 * rendered at the routing level instead (enabled by `experimental.globalNotFound`
 * in `next.config.ts`) — which also means it must supply its own `<html>`,
 * `<body>`, stylesheet and font.
 *
 * There is no locale to read here (no params, no provider), so the copy is
 * written in both languages with explicit `lang` attributes rather than
 * pretending to know which one the visitor wanted. Next injects
 * `<meta name="robots" content="noindex">` for 404 responses automatically.
 */
const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter-cyrillic",
});

export const metadata: Metadata = {
  title: "404 — Страница не найдена · Page not found | LifeOS",
  description:
    "Такого адреса в LifeOS нет. There is nothing at this address.",
};

export default function GlobalNotFound() {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Same blocking script as the app layout, so this page does not flash
            light when the saved theme is dark. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="dark:bg-gray-900">
        <main className="flex min-h-screen items-center justify-center p-6">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 text-center sm:p-10 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-title-xl font-bold text-gray-800 dark:text-white/90">
              404
            </p>

            <h1
              className="mt-3 text-title-sm font-semibold text-gray-800 dark:text-white/90"
              lang="ru"
            >
              Страница не найдена
            </h1>
            <p
              className="mt-3 text-theme-sm text-gray-500 dark:text-gray-400"
              lang="ru"
            >
              Такого адреса в LifeOS нет: возможно, ссылка устарела или в ней
              опечатка.
            </p>

            <div className="my-7 border-t border-gray-100 dark:border-gray-800" />

            <h2
              className="text-lg font-semibold text-gray-800 dark:text-white/90"
              lang="en"
            >
              Page not found
            </h2>
            <p
              className="mt-2 text-theme-sm text-gray-500 dark:text-gray-400"
              lang="en"
            >
              There is nothing at this address — the link may be outdated or
              mistyped.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {/* `/` is the default-locale home page; the Russian one carries a
                  prefix, which is why both are offered. */}
              <a
                href="/"
                className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-600"
              >
                На главную · Back to home
              </a>
              <a
                href="/ru"
                className="inline-flex items-center justify-center rounded-lg px-5 py-3 text-sm font-medium text-brand-500 transition hover:text-brand-600 dark:text-brand-400"
              >
                Русская версия
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
