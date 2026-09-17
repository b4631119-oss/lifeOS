"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import UserAvatar from "@/components/common/UserAvatar";
import Button from "@/components/ui/button/Button";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "@/i18n/navigation";
import { signOutUser } from "@/lib/authActions";
import { displayNameOf, resolveIdentity } from "@/lib/identity";
import {
  PREFERRED_NAME_MAX_LENGTH,
  isPreferredNameValid,
  normalizePreferredName,
} from "@/lib/profile";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

/**
 * The profile page.
 *
 * Three things are true here, and the page is arranged so a user can tell them
 * apart at a glance:
 *
 * - the **name** is editable, because LifeOS keeps its own copy of it
 *   (`users/{uid}.preferredName`) which the Google sign-in sync never writes;
 * - the **email** is not editable and says so, because it belongs to the Google
 *   account — changing it here would only desynchronise the document from the
 *   account it describes;
 * - the **avatar** comes from Google too, and is shown without an edit control
 *   rather than with a fake one. LifeOS stores no files, so it offers no upload.
 *
 * Everything that is not a real capability is absent on purpose. An earlier
 * version of this page displayed a hard-coded stranger's identity next to inert
 * "change password", 2FA, "log out all devices" and "delete account" controls:
 * the app has no account-management backend, so it must not offer
 * account-management UI.
 */
export default function ProfileView() {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const tUserDropdown = useTranslations("userDropdown");
  const { user, profile, savePreferredName } = useAuth();
  const router = useRouter();
  const nameId = useId();

  const identity = resolveIdentity(user, profile?.preferredName);
  const displayName = identity.name || tCommon("accountNameFallback");
  const email = identity.email || tCommon("emailMissing");
  // The name Google reports, and therefore what "use my Google name" restores.
  const googleName = displayNameOf(user);
  const savedPreferredName = profile?.preferredName ?? "";

  /**
   * The field follows the stored name until the user types.
   *
   * `null` means "not edited in this session", which is what keeps a slow profile
   * read from overwriting a half-typed name: no effect ever copies the stored
   * value into the input, so the input can only change because someone typed.
   */
  const [draft, setDraft] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  const value = draft ?? savedPreferredName;
  const isDirty =
    draft !== null &&
    normalizePreferredName(draft) !== normalizePreferredName(savedPreferredName);

  const handleSave = async () => {
    if (!isPreferredNameValid(value)) {
      setError(t("errors.nameInvalid"));
      return;
    }

    setIsSaving(true);
    setError(null);
    setSavedNotice(false);

    try {
      await savePreferredName(value);
      setDraft(null);
      setSavedNotice(true);
    } catch {
      setError(t("errors.save"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUseGoogleName = async () => {
    setIsSaving(true);
    setError(null);
    setSavedNotice(false);

    try {
      // `null` removes the stored field, so the identity falls back to Google
      // rather than to an empty local name.
      await savePreferredName(null);
      setDraft(null);
      setSavedNotice(true);
    } catch {
      setError(t("errors.save"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    setIsSaving(true);
    try {
      await signOutUser();
      router.replace("/signin");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="app-card p-4 sm:p-6">
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
          </div>
        </div>
      </section>

      <section className="app-card p-4 sm:p-6">
        <h4 className="text-base font-medium text-gray-800 dark:text-white/90">
          {t("nameTitle")}
        </h4>
        <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
          {t("nameHint")}
        </p>

        <div className="mt-4 max-w-md">
          <Label htmlFor={nameId}>{t("nameLabel")}</Label>
          <Input
            id={nameId}
            value={value}
            maxLength={PREFERRED_NAME_MAX_LENGTH}
            autoComplete="name"
            placeholder={googleName || tCommon("accountNameFallback")}
            onChange={(event) => {
              setDraft(event.target.value);
              setSavedNotice(false);
              if (error) setError(null);
            }}
            error={Boolean(error)}
          />
        </div>

        {error && (
          <p className="mt-3 text-theme-sm text-error-500" role="alert">
            {error}
          </p>
        )}
        <p className="sr-only" aria-live="polite">
          {savedNotice ? t("nameSaved") : ""}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !isDirty}
          >
            {isSaving ? t("saving") : tCommon("save")}
          </Button>

          {isDirty && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDraft(null);
                setError(null);
              }}
              disabled={isSaving}
            >
              {tCommon("cancel")}
            </Button>
          )}

          {/* Offered only while there is something to undo, and named after the
              account it restores: "use my Google name" is meaningless without
              knowing which name that is. */}
          {savedPreferredName && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUseGoogleName}
              disabled={isSaving}
            >
              {googleName
                ? t("useGoogleName", { name: googleName })
                : t("useGoogleNameFallback")}
            </Button>
          )}
        </div>

        {savedNotice && (
          <p className="mt-3 text-theme-sm text-success-600 dark:text-success-400">
            {t("nameSaved")}
          </p>
        )}
      </section>

      <section className="app-card p-4 sm:p-6">
        <h4 className="text-base font-medium text-gray-800 dark:text-white/90">
          {t("identityTitle")}
        </h4>

        <dl className="mt-4 space-y-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <dt className="text-theme-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
              {t("emailLabel")}
            </dt>
            <dd className="min-w-0 text-theme-sm break-words text-gray-800 dark:text-white/90">
              {email}
            </dd>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <dt className="text-theme-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
              {t("googleNameLabel")}
            </dt>
            <dd className="min-w-0 text-theme-sm break-words text-gray-800 dark:text-white/90">
              {googleName || tCommon("emailMissing")}
            </dd>
          </div>
        </dl>

        <p className="mt-3 text-theme-xs text-gray-500 dark:text-gray-400">
          {t("identityHint")}
        </p>
        <p className="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
          {t("avatarHint")}
        </p>
      </section>

      <section className="app-card p-4 sm:p-6">
        <h4 className="text-base font-medium text-gray-800 dark:text-white/90">
          {t("sessionTitle")}
        </h4>
        <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
          {t("sessionHint")}
        </p>

        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={handleSignOut}
          disabled={isSaving}
        >
          {tUserDropdown("signOut")}
        </Button>
      </section>
    </div>
  );
}
