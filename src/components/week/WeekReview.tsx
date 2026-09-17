"use client";

import { splitDuration } from "@/lib/taskSchedule";
import type { WeekSummary } from "@/lib/week";
import { useTranslations } from "next-intl";

interface WeekReviewProps {
  summary: WeekSummary;
  /** True when the whole week is still ahead of the user. */
  isFutureWeek: boolean;
}

/**
 * What actually happened in the week, counted from its tasks.
 *
 * Every figure is a count of real work and nothing is estimated: there is no
 * "available capacity" (LifeOS has no working-hours setting), no weekly score,
 * and no percentage of anything that was not measured. The completion figure is
 * deliberately about *what was due* — completed against completed + unfinished,
 * so today's own tasks cannot make a week look half-finished while the day is
 * still running — and it is omitted entirely when nothing was due yet.
 *
 * Dropped tasks are shown as their own count and are excluded from the
 * completion figure, exactly as they are on the day and in Analytics: a task the
 * user took off the plan is neither a success nor a failure.
 */
export default function WeekReview({ summary, isFutureWeek }: WeekReviewProps) {
  const t = useTranslations("week");
  const tToday = useTranslations("today");

  const { hours, minutes } = splitDuration(summary.plannedMinutes);
  const plannedTime =
    hours > 0 && minutes > 0
      ? tToday("durationHoursMinutes", { hours, minutes })
      : hours > 0
        ? tToday("durationHours", { hours })
        : tToday("durationMinutes", { minutes });

  const metrics: { key: string; label: string; value: string | number }[] = [
    { key: "planned", label: t("review.planned"), value: summary.planned },
    {
      key: "completed",
      label: t("review.completed"),
      value: summary.completed,
    },
    {
      key: "unfinished",
      label: t("review.unfinished"),
      value: summary.unfinished,
    },
    { key: "upcoming", label: t("review.upcoming"), value: summary.upcoming },
    { key: "dropped", label: t("review.dropped"), value: summary.dropped },
    {
      key: "scheduled",
      label: t("review.scheduled"),
      value: summary.scheduled,
    },
    {
      key: "unscheduled",
      label: t("review.unscheduled"),
      value: summary.unscheduled,
    },
    { key: "plannedTime", label: t("review.plannedTime"), value: plannedTime },
    {
      key: "goalLinked",
      label: t("review.goalLinked"),
      value: summary.goalLinked,
    },
  ];

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <h2 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
        {t("review.title")}
      </h2>

      {summary.completionPercent !== null ? (
        <div className="mt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-theme-sm text-gray-700 dark:text-gray-300">
              {t("review.completion")}
            </span>
            <span className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
              {summary.completionPercent}%
            </span>
          </div>
          <div
            className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
            role="progressbar"
            aria-label={t("review.completion")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={summary.completionPercent}
            aria-valuetext={t("review.completionOf", {
              done: summary.completed,
              due: summary.due,
            })}
          >
            <div
              className="h-full rounded-full bg-success-500 transition-all duration-500"
              style={{ width: `${summary.completionPercent}%` }}
            />
          </div>
          <p className="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
            {t("review.completionOf", {
              done: summary.completed,
              due: summary.due,
            })}
          </p>
          {/* This figure has a near-twin on Analytics, which divides by
              everything planned in its own window. Saying which question each
              one answers is the difference between two honest numbers and a
              page that looks like it got one of them wrong. */}
          <p className="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
            {t("review.completionHint")}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-theme-xs text-gray-500 dark:text-gray-400">
          {t("review.nothingDue")}
        </p>
      )}

      {/* Five across only once the sidebar is not eating the width. */}
      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {metrics.map((metric) => (
          <div
            key={metric.key}
            className="rounded-xl bg-gray-50 px-3 py-2.5 dark:bg-white/[0.03]"
          >
            <dt className="text-theme-xs text-gray-500 dark:text-gray-400">
              {metric.label}
            </dt>
            <dd className="mt-0.5 text-theme-sm font-semibold text-gray-800 dark:text-white/90">
              {metric.value}
            </dd>
          </div>
        ))}
      </dl>

      {isFutureWeek && (
        <p className="mt-4 text-theme-xs text-gray-500 dark:text-gray-400">
          {t("review.futureHint")}
        </p>
      )}
    </section>
  );
}
