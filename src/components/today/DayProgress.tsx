"use client";

import { useDay } from "@/context/DayContext";
import { dayElapsedPercent } from "@/lib/date";
import {
  isScheduled,
  plannedMinutes,
  splitDuration,
  tasksInPlan,
  unscheduledTasks,
} from "@/lib/taskSchedule";
import type { LifeTask } from "@/types/lifeos";
import { cn } from "@/utils";
import { useTranslations } from "next-intl";

interface DayProgressProps {
  tasks: LifeTask[];
}

export default function DayProgress({ tasks }: DayProgressProps) {
  const t = useTranslations("today");
  const { isToday } = useDay();

  // Dropped tasks are off the plan: counting them would show a completion rate
  // the user cannot account for.
  const plan = tasksInPlan(tasks);
  const total = plan.length;
  const done = plan.filter((task) => task.status === "done").length;
  const completedPercent = total === 0 ? 0 : Math.round((done / total) * 100);

  const withoutTime = unscheduledTasks(plan).length;
  const scheduled = plan.filter(isScheduled);
  const planned = plannedMinutes(tasks);
  const { hours, minutes } = splitDuration(planned);

  // "Time elapsed" compares now against the day's scheduled window, which only
  // means something for today (and needs a window to measure against at all).
  const showElapsed = isToday && scheduled.length > 0;
  const elapsedPercent = dayElapsedPercent(tasks);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
      <ProgressCard
        label={t("progressTitle")}
        percent={completedPercent}
        caption={t("ofTasks", { done, total })}
        barClassName="bg-success-500"
      />

      {showElapsed && (
        <ProgressCard
          label={t("timeElapsed")}
          percent={elapsedPercent}
          caption={`${elapsedPercent}%`}
          barClassName="bg-brand-500"
        />
      )}

      {planned > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-theme-sm font-medium text-gray-700 dark:text-gray-300">
            {t("plannedTime")}
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            {hours > 0 && minutes > 0
              ? t("durationHoursMinutes", { hours, minutes })
              : hours > 0
                ? t("durationHours", { hours })
                : t("durationMinutes", { minutes })}
          </p>
          {/* No "available time" figure: LifeOS has no working-hours setting, so
              a capacity warning would be invented precision. What is left
              unscheduled is stated instead, which is a fact. */}
          <p className="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
            {withoutTime > 0
              ? t("withoutTime", { count: withoutTime })
              : t("allScheduled")}
          </p>
        </div>
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

      {/* Named, and spoken in task counts: the percentage is the drawing, the
          caption is what the number actually means. */}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
        role="progressbar"
        aria-label={label}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={caption}
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
