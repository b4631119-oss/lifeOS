"use client";

import { TaskIcon } from "@/icons";
import { useTranslations } from "next-intl";

interface TodayEmptyStateProps {
  /** Only today can be "added to first" — another day gets different wording. */
  isToday: boolean;
}

export default function TodayEmptyState({ isToday }: TodayEmptyStateProps) {
  const t = useTranslations("today");

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center dark:border-gray-700 dark:bg-white/[0.03]">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
        <TaskIcon className="h-5 w-5" />
      </span>
      <h3 className="text-title-sm font-semibold text-gray-800 dark:text-white/90">
        {t("emptyTitle")}
      </h3>
      <p className="mt-2 max-w-sm text-theme-sm text-gray-500 dark:text-gray-400">
        {isToday ? t("emptyMessage") : t("emptyMessageOtherDay")}
      </p>
    </div>
  );
}
