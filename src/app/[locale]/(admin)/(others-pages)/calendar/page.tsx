import Calendar from "@/components/calendar/Calendar";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/classic/palette.css";
import "@fullcalendar/react/themes/classic/theme.css";

import { getTranslations, setRequestLocale } from "next-intl/server";
import { Metadata } from "next";

type CalendarPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: CalendarPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "calendar" });

  return {
    title: `${t("title")} | LifeOS`,
    description: t("metaDescription"),
  };
}

export default async function CalendarPage({ params }: CalendarPageProps) {
  const { locale } = await params;

  // Opts the page into static rendering (the layout sets this too, but pages
  // are rendered in isolation when prerendering).
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "calendar" });

  return (
    <div>
      <PageBreadcrumb pageTitle={t("title")} />
      <Calendar />
    </div>
  );
}
