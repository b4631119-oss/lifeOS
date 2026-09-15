"use client";

import { useTranslations } from "next-intl";

/**
 * Route-level error boundary for every LifeOS page.
 *
 * It sits *inside* `[locale]/layout.tsx`, so the next-intl provider (and the
 * theme/sidebar providers) are still mounted: the failure is reported in the
 * active language and inside the app shell, instead of Next's bare default
 * error screen.
 *
 * `reset()` re-renders the segment, which is the right gesture for a data
 * failure — the same one the retry button in `ErrorBanner` performs.
 */
export default function LocaleError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");
  const tCommon = useTranslations("common");

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center sm:p-8 dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="text-title-sm font-semibold text-gray-800 dark:text-white/90">
          {t("title")}
        </h2>
        <p className="mt-3 text-theme-sm text-gray-500 dark:text-gray-400">
          {t("message")}
        </p>

        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
        >
          {tCommon("retry")}
        </button>
      </div>
    </div>
  );
}
