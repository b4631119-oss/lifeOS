"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { Link } from "@/i18n/navigation";
import { CheckCircleIcon, ChevronLeftIcon } from "@/icons";
import { preloadAuthSdk, sendPasswordReset } from "@/lib/authActions";
import { authErrorKey, firebaseAuthCode } from "@/lib/authErrors";
import { useTranslations } from "next-intl";
import { useState } from "react";

/**
 * The page the "Forgot password?" link on the sign-in form points at.
 *
 * Firebase sends the mail and hosts the landing page for the link itself, so
 * there is nothing to build after the call — the form only has to hand over the
 * address and report what happened.
 *
 * The call goes through `@/lib/authActions`, which loads the SDK when the form
 * is submitted: this page has no `AuthProvider` above it, and nothing here
 * needs one.
 */
export default function ResetPasswordForm() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const address = email.trim();

    try {
      await sendPasswordReset(address);
      setSentTo(address);
    } catch (cause) {
      // Same treatment as the Google button: Firebase's `auth/...` code is
      // mapped to a translated sentence instead of the English blob it ships
      // (and an unconfigured project is reported as a plain failure rather
      // than a stack trace in the UI).
      console.error("Password reset failed:", firebaseAuthCode(cause) ?? cause);
      setError(t(`errors.${authErrorKey(cause)}`));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex w-full flex-1 flex-col lg:w-1/2">
      <div className="mx-auto mb-5 w-full max-w-md sm:pt-10">
        <Link
          href="/signin"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon className="rtl:rotate-180" />
          {t("backToSignIn")}
        </Link>
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div>
          {sentTo ? (
            <>
              <div className="mb-5 sm:mb-8">
                <h1 className="mb-2 text-title-sm font-semibold text-gray-800 sm:text-title-md dark:text-white/90">
                  {t("resetLinkSentTitle")}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("resetLinkSentBody", { email: sentTo })}
                </p>
              </div>
              <div className="mb-6 flex items-center gap-3 rounded-lg border border-success-500/40 bg-success-50 p-4 text-theme-sm text-success-700 dark:bg-success-500/15 dark:text-success-400">
                <CheckCircleIcon className="size-5 shrink-0" />
                <span className="break-all">{sentTo}</span>
              </div>
              <Link
                href="/signin"
                className="inline-flex w-full items-center justify-center rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600"
              >
                {t("backToSignIn")}
              </Link>
            </>
          ) : (
            <>
              <div className="mb-5 sm:mb-8">
                <h1 className="mb-2 text-title-sm font-semibold text-gray-800 sm:text-title-md dark:text-white/90">
                  {t("resetPasswordTitle")}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("resetPasswordSubtitle")}
                </p>
              </div>
              <form onSubmit={handleSubmit} onPointerEnter={preloadAuthSdk}>
                <div className="space-y-6">
                  <div>
                    <Label>
                      {t("email")} <span className="text-error-500">*</span>{" "}
                    </Label>
                    <Input
                      type="email"
                      name="email"
                      required
                      autoComplete="email"
                      placeholder={t("emailPlaceholder")}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      disabled={isLoading}
                      error={Boolean(error)}
                    />
                  </div>
                  {error && (
                    <p
                      role="alert"
                      className="text-theme-xs text-error-500 dark:text-error-400"
                    >
                      {error}
                    </p>
                  )}
                  <div>
                    <Button className="w-full" size="sm" type="submit" disabled={isLoading}>
                      {isLoading ? t("sendingResetLink") : t("sendResetLink")}
                    </Button>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
