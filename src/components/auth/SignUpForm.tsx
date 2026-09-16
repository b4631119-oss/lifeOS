"use client";

import GoogleSignInButton from "./GoogleSignInButton";
import { Link } from "@/i18n/navigation";
import { ChevronLeftIcon } from "@/icons";
import { useTranslations } from "next-intl";

/**
 * Sign-up is the same Google popup as sign-in — an account is created on the
 * first successful sign-in — so the page only carries the button. The
 * first/last name, email, password and terms markup it used to show was inert
 * and collected nothing.
 */
export default function SignUpForm() {
  const t = useTranslations("auth");

  return (
    <div className="no-scrollbar flex w-full flex-1 flex-col overflow-y-auto lg:w-1/2">
      <div className="mx-auto mb-5 w-full max-w-md sm:pt-10">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon className="rtl:rotate-180" />
          {t("backToHome")}
        </Link>
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div className="mb-5 sm:mb-8">
          <h1 className="mb-2 text-title-sm font-semibold text-gray-800 sm:text-title-md dark:text-white/90">
            {t("signUpTitle")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("signUpSubtitle")}
          </p>
        </div>

        <GoogleSignInButton variant="signUp" />

        <p className="mt-6 text-center text-sm font-normal text-gray-700 sm:text-start dark:text-gray-400">
          {t("alreadyHaveAccount")}{" "}
          <Link
            href="/signin"
            className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
          >
            {t("signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
