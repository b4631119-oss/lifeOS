import ServiceWorkerRegistrar from "@/components/common/ServiceWorkerRegistrar";
import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { isRtl } from "@/i18n/languages";
import { type Locale, routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/seo";
import type { Metadata, Viewport } from "next";

import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Inter, Outfit } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit-sans",
});

// Outfit ships no Cyrillic glyphs, so Russian copy would otherwise fall back to
// the browser default (Arial). Inter covers Cyrillic and sits right after Outfit
// in `--font-outfit` (see globals.css), keeping Latin on Outfit while Cyrillic
// renders in Inter instead of an unstyled system fallback.
const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter-cyrillic",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * App-wide PWA metadata.
 *
 * `manifest` points at `src/app/manifest.ts` (served as
 * `/manifest.webmanifest`), `appleWebApp` emits the iOS meta tags that make an
 * "Add to Home Screen" launch full screen, and `icons.apple` is what iOS uses
 * for the home screen icon — it ignores SVG and the manifest on older versions.
 */
export const metadata: Metadata = {
  // Absolute URLs are required for canonical, hreflang and OG tags; every one of
  // them is resolved against this base.
  metadataBase: new URL(SITE_URL),
  applicationName: "LifeOS",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "LifeOS",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/pwa/apple-touch-icon.png",
  },
};

/**
 * `themeColor` belongs to the viewport export in Next 14+, not to `metadata`.
 * It follows the active theme so an installed app's status bar matches the UI.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#101828" },
  ],
};

/**
 * Inline script that runs before React hydration to apply the saved theme
 * immediately, preventing a flash of the wrong colour scheme.
 */
const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('theme');
    var d = document.documentElement;
    if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      d.classList.add('dark');
    } else {
      d.classList.remove('dark');
    }
  } catch(e) {}
})();
`;

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      dir={isRtl(locale as Locale) ? "rtl" : "ltr"}
      className={`${outfit.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="dark:bg-gray-900">
        <NextIntlClientProvider>
          <ThemeProvider>
            <SidebarProvider>{children}</SidebarProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
