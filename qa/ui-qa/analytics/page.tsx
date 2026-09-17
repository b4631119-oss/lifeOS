"use client";

/**
 * TEMPORARY QA screen (see `../page.tsx`).
 *
 * The *real* analytics composition with fixtures, rendered at the document level
 * so the harness can load it in an `<iframe>` of a given width — an iframe is a
 * real viewport for CSS, so the card grid, the two-column block at `xl:` and the
 * chart's own measurement all resolve exactly as they do on a device of that
 * width. A fixed-width `<div>` would not do that.
 *
 * It renders with fixtures rather than from Firestore (there is no account
 * behind the harness), which is possible precisely because `AnalyticsReport`
 * takes a finished report and holds no data hooks — see `buildAnalyticsReport`.
 */
import AnalyticsReport from "@/components/analytics/AnalyticsReport";
import RangeSwitch from "@/components/analytics/RangeSwitch";
import { buildAnalyticsReport, type RangeDays } from "@/lib/analytics";
import { useLocale } from "next-intl";
import { useMemo, useState } from "react";
import Shell from "../Shell";
import {
  ANALYTICS_DONE_DATES,
  ANALYTICS_GOALS,
  ANALYTICS_HABITS,
  ANALYTICS_TASKS,
  TODAY,
} from "../fixtures";

export default function UiQaAnalyticsPage() {
  const locale = useLocale();
  // The range switch really works here, so the 30 day composition (a much
  // longer "Day by day" list) can be looked at and measured too.
  const [days, setDays] = useState<RangeDays>(7);

  const report = useMemo(
    () =>
      buildAnalyticsReport({
        tasks: ANALYTICS_TASKS,
        goals: ANALYTICS_GOALS,
        activeHabits: ANALYTICS_HABITS,
        doneDatesByHabit: ANALYTICS_DONE_DATES,
        today: TODAY,
        days,
        locale,
      }),
    [days, locale],
  );

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="app-page-title">Аналитика</h1>
        <RangeSwitch value={days} onChange={setDays} />
      </div>
      <AnalyticsReport report={report} />
    </Shell>
  );
}
