"use client";

import ComponentCard from "@/components/common/ComponentCard";
import { Link } from "@/i18n/navigation";
import type { AnalyticsReport as AnalyticsReportData } from "@/lib/analytics";
import { formatShortDay, parseDateKey } from "@/lib/date";
import { useLocale, useTranslations } from "next-intl";
import AnalyticsStatCards from "./AnalyticsStatCards";
import DailySummaryList from "./DailySummaryList";
import GoalProgressList from "./GoalProgressList";
import HabitSummaryList from "./HabitSummaryList";
import HoursSection from "./HoursSection";

interface AnalyticsReportProps {
  report: AnalyticsReportData;
}

/**
 * The page, in the order the questions are asked: what did I write down and put
 * on the clock, what did I finish, day by day, which goals moved, when do I
 * actually finish things — and what should I adapt.
 *
 * Presentational on purpose: it takes a finished report (`buildAnalyticsReport`)
 * and holds no hooks beyond translations, so the whole composition can be
 * rendered from fixtures without an account behind it.
 *
 * The notes under the cards exist to keep the numbers explainable. Dropped
 * tasks are invisible otherwise (they are in the captured count and in no
 * completion figure), and a window whose captured work was all taken off the
 * plan is exactly the case where a completion rate would be a lie — the page
 * says what is missing instead of showing a zero.
 */
export default function AnalyticsReport({ report }: AnalyticsReportProps) {
  const t = useTranslations("analytics");
  const locale = useLocale();
  const { summary } = report;

  const notes = [
    !report.hasWindowTasks && t("notes.emptyWindow"),
    summary.planned === 0 &&
      summary.captured > 0 &&
      t("notes.nothingPlanned"),
    summary.dropped > 0 && t("notes.dropped", { count: summary.dropped }),
  ].filter((note): note is string => Boolean(note));

  return (
    <div className="space-y-6">
      {/* What every figure below is counted from. Two bases, stated once. */}
      <p className="text-theme-xs text-gray-500 dark:text-gray-400">
        {t("basis", {
          from: formatShortDay(parseDateKey(report.range.from), locale),
          to: formatShortDay(parseDateKey(report.range.to), locale),
        })}
      </p>

      <AnalyticsStatCards summary={summary} />

      {notes.map((note) => (
        <p
          key={note}
          className="text-theme-sm text-gray-500 dark:text-gray-400"
        >
          {note}
        </p>
      ))}

      {report.hasWindowTasks && (
        <ComponentCard title={t("daily.title")} desc={t("daily.desc")}>
          <DailySummaryList days={report.daily} />
        </ComponentCard>
      )}

      {report.hasWindowTasks && (
        <ComponentCard title={t("goals.title")} desc={t("goals.desc")}>
          <GoalProgressList goals={report.goals} />
        </ComponentCard>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {report.hasWindowTasks && (
          <ComponentCard title={t("hours.title")} desc={t("hours.desc")}>
            <HoursSection insight={report.insight} buckets={report.buckets} />
          </ComponentCard>
        )}

        <ComponentCard title={t("habits.title")} desc={t("habits.subtitle")}>
          <HabitSummaryList streaks={report.streaks} />
        </ComponentCard>
      </div>

      {/* Review → Adapt. It leads to the week, because that is where a task can
          actually be carried, rescheduled or taken off the plan — a link to an
          "insight" that had no such place would be decoration. */}
      <section className="app-card app-card-pad flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h3 className="app-section-title">{t("next.title")}</h3>
          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
            {t("next.message")}
          </p>
        </div>
        <Link
          href="/week"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-500 px-5 text-theme-sm font-medium text-white transition-colors hover:bg-brand-600 focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden"
        >
          {t("next.cta")}
        </Link>
      </section>
    </div>
  );
}
