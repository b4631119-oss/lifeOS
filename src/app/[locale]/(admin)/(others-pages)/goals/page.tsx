import GoalsView from "@/components/goals/GoalsView";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

type GoalsPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: GoalsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "goals" });

  return {
    title: `${t("title")} | LifeOS`,
    description: t("metaDescription"),
  };
}

export default async function GoalsPage({ params }: GoalsPageProps) {
  const { locale } = await params;

  setRequestLocale(locale);

  return <GoalsView />;
}