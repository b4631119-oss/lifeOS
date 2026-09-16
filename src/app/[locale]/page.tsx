import LandingView from "@/components/landing/LandingView";
import {
  languageAlternates,
  localizedPath,
  openGraphLocale,
  toLocale,
} from "@/lib/seo";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

type LandingPageProps = {
  params: Promise<{ locale: string }>;
};

/**
 * The public home page.
 *
 * This is the only route outside the authenticated shell, and it is a Server
 * Component that renders the hero, the value proposition and the benefits as
 * real HTML — no auth check, no loading spinner, no Firebase. It used to be
 * rendered by the dashboard's client-side auth guard, which meant the served
 * document contained a spinner and nothing else, carried the dashboard's
 * metadata ("Today | LifeOS"), and shipped the Firestore SDK to every visitor.
 *
 * `/today` is the dashboard (see the `(admin)` group).
 */
export async function generateMetadata({
  params,
}: LandingPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "landing" });

  const title = t("metaTitle");
  const description = t("metaDescription");
  // The landing lives at the locale root, so its canonical is that root — this
  // is what tells a search engine that `/` and `/ru` are one document in two
  // languages rather than two thin pages with the same words in them.
  const canonical = localizedPath(toLocale(locale), "/");

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: languageAlternates("/"),
    },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: "LifeOS",
      title,
      description,
      locale: openGraphLocale(toLocale(locale)),
      // A real asset that exists in the build — not a placeholder image.
      images: [{ url: "/pwa/icon-512.png", width: 512, height: 512, alt: "LifeOS" }],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: ["/pwa/icon-512.png"],
    },
  };
}

export default async function LandingPage({ params }: LandingPageProps) {
  const { locale } = await params;

  // Opts the route into static rendering, so both locales are prerendered.
  setRequestLocale(locale);

  return <LandingView locale={locale} />;
}
