"use client";

import type { SummaryErrorCode } from "@/hooks/useNotes";
import { useTranslations } from "next-intl";

interface NoteSummaryCardProps {
  summary: string | null;
  summarizing: boolean;
  /** Why the last attempt failed, if it did. */
  error: SummaryErrorCode | null;
  onRetry: () => Promise<void>;
}

export default function NoteSummaryCard({
  summary,
  summarizing,
  error,
  onRetry,
}: NoteSummaryCardProps) {
  const t = useTranslations("notes.summary");
  const tErrors = useTranslations("notes.errors");

  const errorMessages: Record<SummaryErrorCode, string> = {
    rateLimit: tErrors("rateLimit"),
    notConfigured: tErrors("notConfigured"),
    generic: tErrors("summary"),
  };

  if (summarizing) {
    return (
      <div className="animate-pulse rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
          {t("loading")}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-error-500/30 bg-error-50 p-4 dark:bg-error-500/10"
      >
        <p className="text-theme-sm text-error-600 dark:text-error-400">
          {errorMessages[error]}
        </p>
        <button
          type="button"
          onClick={() => void onRetry()}
          className="mt-2 text-theme-xs font-medium text-error-600 underline underline-offset-2 dark:text-error-400"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  if (!summary) {
    return (
      <p className="rounded-xl border border-dashed border-gray-200 p-4 text-theme-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
        {t("empty")}
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 dark:border-brand-500/20 dark:bg-brand-500/10">
      <h4 className="text-theme-xs font-medium tracking-wide text-brand-500 uppercase">
        {t("title")}
      </h4>
      <p className="mt-2 text-theme-sm leading-relaxed text-gray-700 dark:text-gray-300">
        {summary}
      </p>
    </div>
  );
}
