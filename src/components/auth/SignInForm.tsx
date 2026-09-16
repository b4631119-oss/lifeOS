"use client";

import GoogleSignInButton from "./GoogleSignInButton";
import { Link } from "@/i18n/navigation";
import { ChevronLeftIcon } from "@/icons";
import { useTranslations } from "next-intl";

/**
 * Google is the only sign-in provider.
 *
 * The email/password form that used to sit under the button was inert markup:
 * no handler, no `onSubmit`, so pressing Enter reloaded the page — and
 * `signInWithEmail` was never wired to anything. It is gone rather than
 * half-working, and the copy now says what the page actually offers.
 */
export default function SignInForm() {
  const t = useTranslations("auth");

  return (
    <div className="flex w-full flex-1 flex-col lg:w-1/2">
      <div className="mx-auto mb-5 w-full max-w-md sm:pt-10">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon className="rtl:rotate-180" />
          {t("backToDashboard")}
        </Link>
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div className="mb-5 sm:mb-8">
          <h1 className="mb-2 text-title-sm font-semibold text-gray-800 sm:text-title-md dark:text-white/90">
            {t("signInTitle")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("signInSubtitle")}
          </p>
        </div>

        <GoogleSignInButton />

        <p className="mt-6 text-center text-sm font-normal text-gray-700 sm:text-start dark:text-gray-400">
          {t("noAccount")}{" "}
          <Link
            href="/signup"
            className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
          >
            {t("signUp")}
          </Link>
        </p>
      </div>
    </div>
  );
}
