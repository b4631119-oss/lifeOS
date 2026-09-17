"use client";

/**
 * TEMPORARY QA screen (see `../page.tsx`).
 *
 * The analytics states that only appear with particular data, each rendered at
 * the document level so every one of them is measured at the real viewport
 * width of the enclosing iframe: a window whose work has no times at all, a
 * window that was emptied out into "dropped", a window with nothing in it at
 * all, completions spread over the day, and too few completions to name an
 * hour.
 */
import AnalyticsReport from "@/components/analytics/AnalyticsReport";
import {
  buildAnalyticsReport,
  type AnalyticsReport as Report,
} from "@/lib/analytics";
import type { LifeTask } from "@/types/lifeos";
import { useLocale } from "next-intl";
import { useMemo } from "react";
import Shell from "../../Shell";
import {
  ALL_DROPPED_TASKS,
  ANALYTICS_DONE_DATES,
  ANALYTICS_GOALS,
  ANALYTICS_HABITS,
  FEW_COMPLETIONS_TASKS,
  OUT_OF_WINDOW_TASKS,
  SPREAD_TASKS,
  TODAY,
  UNTIMED_ONLY_TASKS,
} from "../../fixtures";

export default function UiQaAnalyticsStatesPage() {
  const locale = useLocale();

  const states = useMemo(() => {
    const build = (tasks: LifeTask[]) =>
      buildAnalyticsReport({
        tasks,
        goals: ANALYTICS_GOALS,
        activeHabits: ANALYTICS_HABITS,
        doneDatesByHabit: ANALYTICS_DONE_DATES,
        today: TODAY,
        days: 7,
        locale,
      });

    return [
      {
        label: "planned, nothing on the clock",
        report: build(UNTIMED_ONLY_TASKS),
      },
      { label: "everything dropped", report: build(ALL_DROPPED_TASKS) },
      { label: "nothing in this window", report: build(OUT_OF_WINDOW_TASKS) },
      { label: "completions spread over the day", report: build(SPREAD_TASKS) },
      { label: "too few completions", report: build(FEW_COMPLETIONS_TASKS) },
    ] satisfies { label: string; report: Report }[];
  }, [locale]);

  return (
    <Shell>
      <div className="space-y-10">
        {states.map((state) => (
          <section key={state.label} className="space-y-4">
            <h2 className="text-theme-sm font-semibold text-brand-500">
              {state.label}
            </h2>
            <AnalyticsReport report={state.report} />
          </section>
        ))}
      </div>
    </Shell>
  );
}
