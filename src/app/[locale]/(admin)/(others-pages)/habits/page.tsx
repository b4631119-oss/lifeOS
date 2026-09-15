import HabitsView from "@/components/habits/HabitsView";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

type HabitsPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: HabitsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "habits" });

  return {
    title: `${t("title")} | LifeOS`,
    description: t("metaDescription"),
  };
}

export default async function Habits({ params }: HabitsPageProps) {
  const { locale } = await params;

  // Opts the page into static rendering (the layout sets this too, but pages
  // are rendered in isolation when prerendering).
  setRequestLocale(locale);

  return <HabitsView />;
}
