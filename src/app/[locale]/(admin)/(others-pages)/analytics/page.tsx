import AnalyticsView from "@/components/analytics/AnalyticsView";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

type AnalyticsPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: AnalyticsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "analytics" });

  return {
    title: `${t("title")} | LifeOS`,
    description: t("metaDescription"),
  };
}

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const { locale } = await params;

  // Keeps the route statically rendered: without this, `getTranslations`
  // above opts the page into dynamic rendering.
  setRequestLocale(locale);

  return <AnalyticsView />;
}
