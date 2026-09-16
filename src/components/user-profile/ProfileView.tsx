"use client";

import UserAvatar from "@/components/common/UserAvatar";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "@/i18n/navigation";
import { signOutUser } from "@/lib/authActions";
import { resolveIdentity } from "@/lib/identity";
import { useTranslations } from "next-intl";
import { useState } from "react";

/**
 * The profile page.
 *
 * It shows the account the user actually signed in with — nothing else. The
 * previous version displayed a hard-coded name, email, phone number and
 * address, with edit dialogs that only logged to the console, a password
 * change button that did nothing, a 2FA switch that moved without being
 * connected to anything, and "logout all devices" / "delete account" buttons
 * with no handlers at all.
 *
 * Those surfaces are gone rather than faked: the app has no account-management
 * backend, so it must not offer account-management UI. The only account action
 * that genuinely exists — signing out — is here, next to the identity it
 * affects.
 */
export default function ProfileView() {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const tUserDropdown = useTranslations("userDropdown");
  const { user } = useAuth();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const identity = resolveIdentity(user);
  const displayName = identity.name || tCommon("accountNameFallback");
  const email = identity.email || tCommon("emailMissing");

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOutUser();
      router.replace("/signin");
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 lg:p-6 dark:border-gray-800 dark:bg-white/3">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <UserAvatar
            size="lg"
            photoURL={identity.photoURL}
            name={identity.name}
          />

          <div className="min-w-0">
            <h3 className="text-lg font-semibold break-words text-gray-800 dark:text-white/90">
              {displayName}
            </h3>
            <p className="mt-1 text-theme-sm break-words text-gray-500 dark:text-gray-400">
              {email}
            </p>
            <p className="mt-3 text-theme-xs text-gray-500 dark:text-gray-400">
              {t("googleAccountNote")}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 lg:p-6 dark:border-gray-800 dark:bg-white/3">
        <h4 className="text-base font-medium text-gray-800 dark:text-white/90">
          {t("sessionTitle")}
        </h4>
        <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
          {t("sessionHint")}
        </p>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/3 dark:hover:text-gray-200"
        >
          {tUserDropdown("signOut")}
        </button>
      </section>
    </div>
  );
}
