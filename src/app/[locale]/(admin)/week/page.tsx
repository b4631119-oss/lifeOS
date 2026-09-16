import WeekView from "@/components/week/WeekView";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

type WeekPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: WeekPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "week" });

  return {
    title: `${t("title")} | LifeOS`,
    description: t("metaDescription"),
  };
}

export default async function WeekPage({ params }: WeekPageProps) {
  const { locale } = await params;

  // Opts the page into static rendering (the layout sets this too, but pages
  // are rendered in isolation when prerendering).
  setRequestLocale(locale);

  return <WeekView />;
}
