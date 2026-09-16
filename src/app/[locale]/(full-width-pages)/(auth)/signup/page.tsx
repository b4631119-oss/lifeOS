import SignUpForm from "@/components/auth/SignUpForm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

type SignUpPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: SignUpPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });

  return {
    title: `${t("signUpTitle")} | LifeOS`,
    description: t("signUpMetaDescription"),
  };
}

export default async function SignUp({ params }: SignUpPageProps) {
  const { locale } = await params;

  // Opts the page into static rendering (the layout sets this too, but pages
  // are rendered in isolation when prerendering).
  setRequestLocale(locale);

  return <SignUpForm />;
}
