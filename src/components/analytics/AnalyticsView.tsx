"use client";

import ErrorBanner from "@/components/common/ErrorBanner";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useAuth } from "@/context/AuthContext";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useGoals } from "@/hooks/useGoals";
import { useHabits } from "@/hooks/useHabits";
import {
  buildAnalyticsReport,
  hasAnyData,
  type RangeDays,
} from "@/lib/analytics";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import AnalyticsEmptyState from "./AnalyticsEmptyState";
import AnalyticsReport from "./AnalyticsReport";
import RangeSwitch from "./RangeSwitch";

/**
 * The analytics screen: load the data, build the report, render it.
 *
 * Everything between the queries and the markup lives in
 * `buildAnalyticsReport`, so this component only owns the two pieces of state a
 * page can own — the selected range, and where the data comes from — and the
 * figures cannot drift from each other as the sections change.
 *
 * Three loads feed one report: the bounded task read, the habit logs, and the
 * goals subscription (the same one Today, Week and Goals already hold open).
 * Nothing new is queried for the goal section, and nothing is read outside the
 * window.
 */
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
  const { goals, loading: goalsLoading } = useGoals(user?.uid);

  const [range, setRange] = useState<RangeDays>(7);

  // The task hook already loaded the 30 day window, so switching to 7 days is a
  // pure recomputation — no refetch, no loading flash.
  const report = useMemo(
    () =>
      buildAnalyticsReport({
        tasks,
        goals,
        activeHabits,
        doneDatesByHabit,
        today,
        days: range,
        locale,
      }),
    [tasks, goals, activeHabits, doneDatesByHabit, today, range, locale],
  );

  const isLoading = loading || habitsLoading || goalsLoading;
  const isEmpty = !isLoading && !hasAnyData(tasks, activeHabits);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <PageBreadcrumb pageTitle={t("title")} />
        <RangeSwitch value={range} onChange={setRange} />
      </div>

      {error && <ErrorBanner message={t("errors.load")} onRetry={reload} />}

      {isLoading && (
        <div className="app-card app-card-pad">
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            {t("loading")}
          </p>
        </div>
      )}

      {isEmpty && <AnalyticsEmptyState />}

      {!isLoading && !isEmpty && <AnalyticsReport report={report} />}
    </div>
  );
}
