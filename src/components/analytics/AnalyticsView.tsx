"use client";

import ComponentCard from "@/components/common/ComponentCard";
import ErrorBanner from "@/components/common/ErrorBanner";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useAuth } from "@/context/AuthContext";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useHabits } from "@/hooks/useHabits";
import {
  buildDailyCompletionSeries,
  buildHourHistogram,
  hasAnyData,
  hasCompletionTimes,
  summarizeHabits,
  summarizeTasks,
  tasksWithinDays,
  type RangeDays,
} from "@/lib/analytics";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import AnalyticsEmptyState from "./AnalyticsEmptyState";
import AnalyticsStatCards from "./AnalyticsStatCards";
import HabitSummaryList from "./HabitSummaryList";
import ProductiveHoursChart from "./ProductiveHoursChart";
import RangeSwitch from "./RangeSwitch";
import TaskCompletionChart from "./TaskCompletionChart";

export default function AnalyticsView() {
  const t = useTranslations("analytics");
  const locale = useLocale();
  const { user } = useAuth();

  const { tasks, loading, error, reload } = useAnalytics(user?.uid);
  const {
    activeHabits,
    doneDatesByHabit,
    today,
    loading: habitsLoading,
  } = useHabits(user?.uid);

  const [range, setRange] = useState<RangeDays>(7);

  // The hook already loaded the 30 day window, so switching to 7 days is a pure
  // recomputation — no refetch, no loading flash.
  const windowTasks = useMemo(
    () => tasksWithinDays(tasks, range),
    [tasks, range],
  );
  const dailySeries = useMemo(
    () => buildDailyCompletionSeries(tasks, range, locale),
    [tasks, range, locale],
  );
  const buckets = useMemo(() => buildHourHistogram(windowTasks), [windowTasks]);
  const summary = useMemo(
    () => summarizeTasks(windowTasks, buckets),
    [windowTasks, buckets],
  );
  const streaks = useMemo(
    () => summarizeHabits(activeHabits, doneDatesByHabit, today),
    [activeHabits, doneDatesByHabit, today],
  );

  const isLoading = loading || habitsLoading;
  const isEmpty = !isLoading && !hasAnyData(tasks, activeHabits);
  // Completion times only exist for tasks finished after the field was added,
  // so an all-zero histogram means "not enough history", not "unproductive".
  const hasHourData = hasCompletionTimes(buckets);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <PageBreadcrumb pageTitle={t("title")} />
        <RangeSwitch value={range} onChange={setRange} />
      </div>

      <p className="mb-6 text-theme-sm text-gray-500 dark:text-gray-400">
        {t("subtitle")}
      </p>

      {error && <ErrorBanner message={t("errors.load")} onRetry={reload} />}

      {isLoading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            {t("loading")}
          </p>
        </div>
      )}

      {isEmpty && <AnalyticsEmptyState />}

      {!isLoading && !isEmpty && (
        <div className="space-y-6">
          <AnalyticsStatCards
            summary={summary}
            activeHabitCount={activeHabits.length}
          />

          <ComponentCard
            title={t("taskChart.title")}
            desc={t("taskChart.subtitle")}
          >
            <TaskCompletionChart data={dailySeries} />
          </ComponentCard>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ComponentCard
              title={t("hoursChart.title")}
              desc={t("hoursChart.subtitle")}
            >
              {hasHourData ? (
                <ProductiveHoursChart buckets={buckets} />
              ) : (
                <div className="py-8 text-center">
                  <p className="text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("hoursChart.noDataTitle")}
                  </p>
                  <p className="mx-auto mt-1.5 max-w-sm text-theme-xs text-gray-500 dark:text-gray-400">
                    {t("hoursChart.noDataMessage")}
                  </p>
                </div>
              )}
            </ComponentCard>

            <ComponentCard
              title={t("habits.title")}
              desc={t("habits.subtitle")}
            >
              <HabitSummaryList streaks={streaks} />
            </ComponentCard>
          </div>
        </div>
      )}
    </div>
  );
}
