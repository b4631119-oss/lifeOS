import GoalDetailView from "@/components/goals/GoalDetailView";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

type GoalPageProps = {
  params: Promise<{ locale: string; goalId: string }>;
};

export async function generateMetadata({
  params,
}: GoalPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "goals" });

  // The goal's own title cannot be read here: the data lives in Firestore
  // behind the signed-in user, and this is a server component. So the metadata
  // names the section rather than inventing a title for it.
  return {
    title: `${t("title")} | LifeOS`,
    description: t("metaDescription"),
  };
}

export default async function GoalPage({ params }: GoalPageProps) {
  const { locale, goalId } = await params;

  setRequestLocale(locale);

  return <GoalDetailView goalId={goalId} />;
}
