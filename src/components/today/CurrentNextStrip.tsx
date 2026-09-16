"use client";

import { formatTime, formatTimeRange } from "@/lib/date";
import { currentAndNextTasks } from "@/lib/taskSchedule";
import type { LifeTask } from "@/types/lifeos";
import { useLocale, useTranslations } from "next-intl";
import { minutesOfDay, useNowMs } from "@/hooks/useNowMs";

interface CurrentNextStripProps {
  tasks: LifeTask[];
  /** The day being looked at — current/next only mean something for today. */
  isToday: boolean;
}

/**
 * "What am I on, what's next."
 *
 * A reading of the existing scheduled fields at this minute — no new status is
 * written and nothing changes colour by itself. Rendered only for today (the
 * clock says nothing about another day) and only once it has hydrated, since
 * the position cannot match between server and client.
 */
export default function CurrentNextStrip({
  tasks,
  isToday,
}: CurrentNextStripProps) {
  const t = useTranslations("today");
  const locale = useLocale();
  const nowMs = useNowMs();

  if (!isToday || nowMs === null) return null;

  const { current, next } = currentAndNextTasks(tasks, minutesOfDay(nowMs));
  if (!current && !next) return null;

  return (
    <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <dl className="space-y-2">
        {current && (
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <dt className="text-theme-xs font-medium tracking-wide text-brand-500 uppercase">
              {t("current")}
            </dt>
            <dd className="min-w-0 flex-1 truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {current.title}
            </dd>
            <dd className="text-theme-xs text-gray-500 dark:text-gray-400">
              {formatTimeRange(current.startTime, current.endTime, locale)}
            </dd>
          </div>
        )}

        {next && (
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <dt className="text-theme-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
              {t("next")}
            </dt>
            <dd className="min-w-0 flex-1 truncate text-theme-sm text-gray-800 dark:text-white/90">
              {next.title}
            </dd>
            <dd className="text-theme-xs text-gray-500 dark:text-gray-400">
              {formatTime(next.startTime, locale)}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}
