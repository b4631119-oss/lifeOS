import { AuthProvider } from "@/context/AuthContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { isRtl } from "@/i18n/languages";
import { type Locale, routing } from "@/i18n/routing";
import "flatpickr/dist/flatpickr.css";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Inter, Outfit } from "next/font/google";
import { notFound } from "next/navigation";
import "simplebar-react/dist/simplebar.min.css";
import "swiper/css/bundle";
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
    >
      <body className="dark:bg-gray-900">
        <NextIntlClientProvider>
          <ThemeProvider>
            <AuthProvider>
              <SidebarProvider>{children}</SidebarProvider>
            </AuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
