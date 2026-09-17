"use client";

import { ShootingStarIcon } from "@/icons";
import { useTranslations } from "next-intl";

interface GoalEmptyStateProps {
  onAddGoal: () => void;
}

export default function GoalEmptyState({ onAddGoal }: GoalEmptyStateProps) {
  const t = useTranslations("goals");

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-white/[0.03]">
      <ShootingStarIcon className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
      <h3 className="text-theme-md mt-4 font-semibold text-gray-800 dark:text-white/90">
        {t("emptyTitle")}
      </h3>
      <p className="mt-2 text-theme-sm text-gray-500 dark:text-gray-400">
        {t("emptyMessage")}
      </p>
      <button
        type="button"
        onClick={onAddGoal}
        className="mt-6 rounded-lg bg-brand-500 px-6 py-2.5 text-theme-sm font-medium text-white transition-colors hover:bg-brand-600"
      >
        + {t("addGoal")}
      </button>
    </div>
  );
}
