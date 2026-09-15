import ScheduleView from "@/components/schedule/ScheduleView";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Metadata } from "next";

type SchedulePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: SchedulePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "schedule" });

  return {
    title: `${t("title")} | LifeOS`,
    description: t("metaDescription"),
  };
}

export default async function SchedulePage({ params }: SchedulePageProps) {
  const { locale } = await params;

  // Opts the page into static rendering (the layout sets this too, but pages
  // are rendered in isolation when prerendering).
  setRequestLocale(locale);

  return <ScheduleView />;
}
