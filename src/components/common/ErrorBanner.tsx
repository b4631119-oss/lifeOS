"use client";

import { useTranslations } from "next-intl";

interface ErrorBannerProps {
  /** Module-specific sentence, e.g. `t("errors.load")`. */
  message: string;
  /**
   * Re-runs the failed work (a fresh subscription for the realtime modules).
   * Omit it only where there is nothing to re-run.
   */
  onRetry?: () => void;
}

/**
 * The inline failure strip every LifeOS module shows. It used to be copy-pasted
 * per module with a "refresh the page" wording and — on one page only — a retry
 * button, so the same failure looked different depending on where it happened.
 */
export default function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  const t = useTranslations("common");

  return (
    <div
      role="alert"
      className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-error-500/30 bg-error-50 px-4 py-3 text-theme-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
    >
      <span>{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="font-medium underline underline-offset-2 transition hover:text-error-700 dark:hover:text-error-300"
        >
          {t("retry")}
        </button>
      )}
    </div>
  );
}
