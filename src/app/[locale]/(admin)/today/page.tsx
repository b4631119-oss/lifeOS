import TodayViewLoader from "@/components/today/TodayViewLoader";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

type TodayPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: TodayPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "today" });

  return {
    title: `${t("title")} | LifeOS`,
    description: t("metaDescription"),
  };
}

export default async function Today({ params }: TodayPageProps) {
  const { locale } = await params;

  // Opts the page into static rendering (the layout sets this too, but pages
  // are rendered in isolation when prerendering).
  setRequestLocale(locale);

  return <TodayViewLoader />;
}
