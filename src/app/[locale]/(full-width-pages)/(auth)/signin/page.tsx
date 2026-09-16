import SignInForm from "@/components/auth/SignInForm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

type SignInPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: SignInPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });

  return {
    title: `${t("signInTitle")} | LifeOS`,
    description: t("signInMetaDescription"),
  };
}

export default async function SignIn({ params }: SignInPageProps) {
  const { locale } = await params;

  // Opts the page into static rendering (the layout sets this too, but pages
  // are rendered in isolation when prerendering).
  setRequestLocale(locale);

  return <SignInForm />;
}
