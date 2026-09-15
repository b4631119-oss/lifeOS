"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "@/i18n/navigation";
import { GoogleIcon } from "@/icons";
import { authErrorKey, currentHost, firebaseAuthCode } from "@/lib/authErrors";
import { useTranslations } from "next-intl";
import { useState } from "react";

export default function GoogleSignInButton() {
  const t = useTranslations("auth");
  const { loginWithGoogle } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await loginWithGoogle();
      router.replace("/");
    } catch (cause) {
      // Firebase's own message is English and cryptic
      // (`Firebase: Error (auth/unauthorized-domain)`), so it is mapped to a
      // translated one; the domain case also names the host to allow-list,
      // which is the only way to act on it without reading Firebase docs.
      console.error("Google sign-in failed:", firebaseAuthCode(cause) ?? cause);
      setError(t(`errors.${authErrorKey(cause)}`, { host: currentHost() }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleSignIn}
        disabled={isLoading}
        className="inline-flex w-full items-center justify-center gap-3 rounded-lg bg-gray-100 px-7 py-3 text-sm font-normal text-gray-700 transition-colors hover:bg-gray-200 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10"
      >
        <GoogleIcon />
        {isLoading ? t("signingIn") : t("signInWithGoogle")}
      </button>
      {error && (
        <p className="text-theme-xs text-error-500 dark:text-error-400">
          {error}
        </p>
      )}
    </div>
  );
}
