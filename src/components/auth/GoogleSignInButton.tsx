"use client";

import { useRouter } from "@/i18n/navigation";
import { GoogleIcon } from "@/icons";
import { preloadAuthSdk, signInWithGoogle } from "@/lib/authActions";
import { authErrorKey, currentHost, firebaseAuthCode } from "@/lib/authErrors";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

interface GoogleSignInButtonProps {
  /** Sign-up reuses the same Google popup, only the label differs. */
  variant?: "signIn" | "signUp";
}

/**
 * The only way into the product (see `lib/authActions.ts`).
 *
 * Signing in lands on the dashboard (`/today`). That is safe even though the
 * popup's promise can resolve before React has seen the auth event: the
 * dashboard mounts its own `AuthProvider`, which starts in the loading state
 * and only renders the guard once the persisted session has been read back.
 */
export default function GoogleSignInButton({
  variant = "signIn",
}: GoogleSignInButtonProps) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await signInWithGoogle();
      router.replace("/today");
    } catch (cause: unknown) {
      // popup-blocked errors have no code — show a translated message
      if (
        cause instanceof Error &&
        cause.message.includes("popup-blocked")
      ) {
        setError(t("errors.popupBlocked"));
      } else {
        console.error("Google sign-in failed:", firebaseAuthCode(cause) ?? cause);
        setError(t(`errors.${authErrorKey(cause)}`, { host: currentHost() }));
      }
    } finally {
      setIsLoading(false);
    }
  }, [router, t]);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleSignIn}
        // Warms the auth chunk on hover/focus so the click doesn't wait for the
        // network. Deliberately the auth SDK only: warming the Firestore facade
        // here would download the whole data layer to sign in.
        onMouseEnter={preloadAuthSdk}
        onFocus={preloadAuthSdk}
        disabled={isLoading}
        className="inline-flex w-full items-center justify-center gap-3 rounded-lg bg-gray-100 px-7 py-3 text-sm font-normal text-gray-700 transition-colors hover:bg-gray-200 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10"
      >
        <GoogleIcon />
        {isLoading
          ? t("signingIn")
          : t(variant === "signUp" ? "signUpWithGoogle" : "signInWithGoogle")}
      </button>
      {error && (
        <p className="text-theme-xs text-error-500 dark:text-error-400">
          {error}
        </p>
      )}
    </div>
  );
}
