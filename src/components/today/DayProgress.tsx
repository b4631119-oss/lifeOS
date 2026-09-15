"use client";

import { dayElapsedPercent } from "@/lib/date";
import type { LifeTask } from "@/types/lifeos";
import { cn } from "@/utils";
import { useTranslations } from "next-intl";

interface DayProgressProps {
  tasks: LifeTask[];
}

export default function DayProgress({ tasks }: DayProgressProps) {
  const t = useTranslations("today");

  const total = tasks.length;
  const done = tasks.filter((task) => task.status === "done").length;
  const completedPercent = total === 0 ? 0 : Math.round((done / total) * 100);
  const elapsedPercent = dayElapsedPercent(tasks);
  // Without any tasks there is no schedule for the day to be measured against,
  // so the elapsed bar is hidden instead of showing a meaningless percentage.
  const hasSchedule = total > 0;

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 md:gap-6",
        hasSchedule && "sm:grid-cols-2",
      )}
    >
      <ProgressCard
        label={t("progressTitle")}
        percent={completedPercent}
        caption={t("ofTasks", { done, total })}
        barClassName="bg-success-500"
      />
      {hasSchedule && (
        <ProgressCard
          label={t("timeElapsed")}
          percent={elapsedPercent}
          caption={`${elapsedPercent}%`}
          barClassName="bg-brand-500"
        />
      )}
    </div>
  );
}

type ProgressCardProps = {
  label: string;
  percent: number;
  caption: string;
  barClassName: string;
};

function ProgressCard({
  label,
  percent,
  caption,
  barClassName,
}: ProgressCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-theme-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
        <span className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
          {percent}%
        </span>
      </div>

      <div
        className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            barClassName,
          )}
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
        {caption}
      </p>
    </div>
  );
}
