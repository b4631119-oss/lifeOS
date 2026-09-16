"use client";

import { useRouter } from "@/i18n/navigation";
import { GoogleIcon } from "@/icons";
import { authErrorKey, currentHost, firebaseAuthCode } from "@/lib/authErrors";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";

/** Lazy-load Firebase Auth SDK and sign in with Google popup. */
async function signInWithGoogle() {
  const [{ getFirebaseApp }, { getAuth, GoogleAuthProvider, signInWithPopup }] =
    await Promise.all([import("@/lib/firebase"), import("firebase/auth")]);
  const auth = getAuth(getFirebaseApp());
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(auth, provider);
}

interface GoogleSignInButtonProps {
  /** Sign-up reuses the same Google popup, only the label differs. */
  variant?: "signIn" | "signUp";
}

export default function GoogleSignInButton({
  variant = "signIn",
}: GoogleSignInButtonProps) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleSignIn = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await signInWithGoogle();
      router.replace("/");
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

  // Prefetch Firebase SDK on hover / focus so the click doesn't wait for network.
  const prefetch = useCallback(() => {
    if (abortRef.current) return;
    const ac = new AbortController();
    abortRef.current = ac;
    import("@/lib/firebase").catch(() => {});
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleSignIn}
        onMouseEnter={prefetch}
        onFocus={prefetch}
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
