import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ProfileView from "@/components/user-profile/ProfileView";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Metadata } from "next";

type ProfilePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "profile" });

  return {
    title: `${t("title")} | LifeOS`,
    description: t("metaDescription"),
  };
}

export default async function Profile({ params }: ProfilePageProps) {
  const { locale } = await params;

  // Opts the page into static rendering (the layout sets this too, but pages
  // are rendered in isolation when prerendering).
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "profile" });

  return (
    <div>
      <PageBreadcrumb pageTitle={t("title")} />
      <ProfileView />
    </div>
  );
}
