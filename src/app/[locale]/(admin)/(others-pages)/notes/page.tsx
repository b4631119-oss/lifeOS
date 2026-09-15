import NotesView from "@/components/notes/NotesView";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

type NotesPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: NotesPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "notes" });

  return {
    title: `${t("title")} | LifeOS`,
    description: t("metaDescription"),
  };
}

export default async function NotesPage({ params }: NotesPageProps) {
  const { locale } = await params;

  // Keeps the route statically rendered: without this, `getTranslations`
  // above opts the page into dynamic rendering.
  setRequestLocale(locale);

  return <NotesView />;
}
