import GridShape from "@/components/common/GridShape";
import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";

import { ThemeProvider } from "@/context/ThemeContext";
import { Link } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";
import React from "react";

type AuthLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AuthLayout({
  children,
  params,
}: AuthLayoutProps) {
  const { locale } = await params;

  // Opts the layout into static rendering (the root layout sets this too, but
  // layouts are rendered in isolation when prerendering).
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "auth" });
  const tCommon = await getTranslations({ locale, namespace: "common" });

  return (
    <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <ThemeProvider>
        <div className="relative flex lg:flex-row w-full h-screen justify-center flex-col  dark:bg-gray-900 sm:p-0">
          {children}
          <div className="lg:w-1/2 w-full h-full bg-brand-950 dark:bg-white/5 lg:grid items-center hidden">
            <div className="relative items-center justify-center  flex z-1">
              {/* <!-- ===== Common Grid Shape Start ===== --> */}
              <GridShape />
              <div className="flex flex-col items-center max-w-xs">
                <Link href="/" className="block mb-4">
                  {/* An absolute `/images/...`, not `./images/...`: the auth
                      routes live under a locale prefix, so the relative path
                      resolved to /ru/images/... and the logo 404ed there. */}
                  <Image
                    width={231}
                    height={48}
                    src="/images/logo/auth-logo.svg"
                    alt={tCommon("logoAlt")}
                  />
                </Link>
                <p className="text-center text-gray-400 dark:text-white/60">
                  {t("tagline")}
                </p>
              </div>
            </div>
          </div>
          <div className="fixed bottom-6 end-6 z-50 hidden sm:block">
            <ThemeTogglerTwo />
          </div>
        </div>
      </ThemeProvider>
    </div>
  );
}
