import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

type ResetPasswordPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: ResetPasswordPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });

  return {
    title: `${t("resetPasswordTitle")} | LifeOS`,
    description: t("resetPasswordMetaDescription"),
  };
}

export default async function ResetPassword({
  params,
}: ResetPasswordPageProps) {
  const { locale } = await params;

  // Opts the page into static rendering (the layout sets this too, but pages
  // are rendered in isolation when prerendering).
  setRequestLocale(locale);

  return <ResetPasswordForm />;
}
