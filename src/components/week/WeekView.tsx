"use client";

import ErrorBanner from "@/components/common/ErrorBanner";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import RescheduleModal, {
  type RescheduleValues,
} from "@/components/today/RescheduleModal";
import UnfinishedTasksPanel from "@/components/today/UnfinishedTasksPanel";
import { useAuth } from "@/context/AuthContext";
import { useDay } from "@/context/DayContext";
import { useGoals } from "@/hooks/useGoals";
import { useWeekTasks, type BulkResult } from "@/hooks/useWeekTasks";
import { useRouter } from "@/i18n/navigation";
import { formatShortDay, nextDayKey, parseDateKey } from "@/lib/date";
import { DROP_PATCH, groupUnfinishedByDay } from "@/lib/taskSchedule";
import {
  WEEK_LENGTH,
  summarizeWeek,
  weekDayBuckets,
  weekDayKeys,
  weekStartFor,
  weekStartsOnFor,
} from "@/lib/week";
import type { Goal, LifeTask } from "@/types/lifeos";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import WeekBulkBar from "./WeekBulkBar";
import WeekDayCard from "./WeekDayCard";
import WeekNavigator from "./WeekNavigator";
import WeekReview from "./WeekReview";

/** Stable empty selection, so an untouched week keeps a stable identity. */
const NO_SELECTION: string[] = [];

/**
 * The week, as a view of the tasks that already exist.
 *
 * It adds no entity of its own: the seven days come from the calendar, the
 * tasks come from one bounded read of the same `tasks` collection Today and the
 * Schedule write to, and every number in the review is counted from those tasks.
 * The week is for *planning* (and reviewing what the plan produced), Today stays
 * the place where work is executed, and the Schedule stays the hour-by-hour
 * version of a single day.
 */
export default function WeekView() {
  const t = useTranslations("week");
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuth();
  const { today, goToDate } = useDay();

  // Which day a week begins on is the locale's business, not the UI's.
  const weekStartsOn = useMemo(() => weekStartsOnFor(locale), [locale]);
  const [weekOffset, setWeekOffset] = useState(0);

  // Stored as an offset from the current week, so offset 0 keeps following the
  // calendar — a tab left open over the weekend shows the new week.
  const startKey = weekStartFor(today, weekOffset, weekStartsOn);
  const dayKeys = useMemo(() => weekDayKeys(startKey), [startKey]);
  const endKey = dayKeys[WEEK_LENGTH - 1];

  const {
    tasks,
    loading,
    error,
    editTask,
    bulkMove,
    bulkDrop,
    reload,
  } = useWeekTasks(user?.uid, startKey, endKey);
  // Only the goals' names are needed: a task shows which goal it moves forward
  // (one listener for the whole page, and no query per task).
  const { goals, loading: goalsLoading } = useGoals(user?.uid);

  const goalsById = useMemo<Record<string, Goal>>(
    () => Object.fromEntries(goals.map((goal) => [goal.id, goal])),
    [goals],
  );

  const summary = useMemo(
    () => summarizeWeek(tasks, dayKeys, today),
    [tasks, dayKeys, today],
  );
  const buckets = useMemo(() => weekDayBuckets(tasks, dayKeys), [tasks, dayKeys]);
  // Open work dated before today: what a decision is owed on. Passing the
  // week's own tasks means the list can only ever name days of this week, and
  // tomorrow as the bound keeps today's unfinished day out of it.
  const unfinished = useMemo(
    () => groupUnfinishedByDay(tasks, today),
    [tasks, today],
  );

  /**
   * Selection and bulk target are tagged with the week they were made in.
   *
   * Selecting something and then paging to another week must not leave a hidden
   * selection behind that the next bulk action would apply to.
   */
  const [selection, setSelection] = useState<{ week: string; ids: string[] }>({
    week: startKey,
    ids: NO_SELECTION,
  });
  const selectedIds = selection.week === startKey ? selection.ids : NO_SELECTION;

  const [bulkTarget, setBulkTarget] = useState<{
    week: string;
    date: string;
  } | null>(null);
  // Where the week's leftovers would go by default: the day after its last day,
  // i.e. the first day of the next week.
  const targetDate =
    bulkTarget?.week === startKey ? bulkTarget.date : nextDayKey(endKey);

  const [result, setResult] = useState<BulkResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [rescheduling, setRescheduling] = useState<LifeTask | null>(null);

  const handleToggleSelect = useCallback(
    (taskId: string) => {
      setSelection((previous) => {
        const ids = previous.week === startKey ? previous.ids : NO_SELECTION;
        return {
          week: startKey,
          ids: ids.includes(taskId)
            ? ids.filter((id) => id !== taskId)
            : [...ids, taskId],
        };
      });
    },
    [startKey],
  );

  const handleClearSelection = useCallback(() => {
    setSelection({ week: startKey, ids: NO_SELECTION });
    setResult(null);
  }, [startKey]);

  /** Opens the day in the existing day navigation, then goes to Today. */
  const handleOpenDay = useCallback(
    (date: string) => {
      goToDate(date);
      router.push("/today");
    },
    [goToDate, router],
  );

  const runBulk = useCallback(
    async (action: "move" | "drop") => {
      if (selectedIds.length === 0) return;

      setBusy(true);
      setResult(null);

      try {
        setResult(
          action === "move"
            ? await bulkMove(selectedIds, targetDate)
            : await bulkDrop(selectedIds),
        );
        // The selection is spent either way: the tasks that moved are no longer
        // in this week, and the ones that failed stay visible where they are.
        setSelection({ week: startKey, ids: NO_SELECTION });
      } finally {
        setBusy(false);
      }
    },
    [bulkDrop, bulkMove, selectedIds, startKey, targetDate],
  );

  const handleReschedule = useCallback(
    async (values: RescheduleValues) => {
      if (!rescheduling) return;
      // Errors propagate, so the dialog stays open and shows its own message.
      await editTask(rescheduling.id, values);
      setRescheduling(null);
    },
    [editTask, rescheduling],
  );

  const handleDrop = useCallback(
    (task: LifeTask) => {
      // The banner above reports a failure; the task stays where it was.
      editTask(task.id, DROP_PATCH).catch(() => undefined);
    },
    [editTask],
  );

  const handleRestore = useCallback(
    (task: LifeTask) => {
      editTask(task.id, { dropped: false }).catch(() => undefined);
    },
    [editTask],
  );

  const isFutureWeek = startKey > today;

  return (
    <div>
      <PageBreadcrumb pageTitle={t("title")} />

      {error && (
        <ErrorBanner
          message={error.kind === "load" ? t("errors.load") : t("errors.save")}
          onRetry={error.kind === "load" ? reload : undefined}
        />
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <WeekNavigator
          startKey={startKey}
          offset={weekOffset}
          onPreviousWeek={() => setWeekOffset((value) => value - 1)}
          onNextWeek={() => setWeekOffset((value) => value + 1)}
          onThisWeek={() => setWeekOffset(0)}
        />
      </div>

      <p className="mb-6 text-theme-sm text-gray-500 dark:text-gray-400">
        {t("subtitle")}
      </p>

      <WeekReview summary={summary} isFutureWeek={isFutureWeek} />

      {unfinished.length > 0 && (
        <div className="mt-6">
          <UnfinishedTasksPanel
            groups={unfinished}
            // Carry sends a task to the day after the week being reviewed —
            // the next week's first day, named on the button.
            dayKey={endKey}
            onUpdate={editTask}
            carryLabel={t("review.carryTo", {
              date: formatShortDay(parseDateKey(nextDayKey(endKey)), locale),
            })}
            hint={t("review.hint")}
            hiddenHint={t("review.hiddenHint")}
          />
        </div>
      )}

      <h2 className="sr-only">{t("daysTitle")}</h2>

      {loading ? (
        <p className="mt-4 text-theme-sm text-gray-500 dark:text-gray-400">
          {t("loading")}
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {buckets.map((bucket) => (
            <WeekDayCard
              key={bucket.date}
              date={bucket.date}
              tasks={bucket.tasks}
              goalsById={goalsById}
              goalsResolved={!goalsLoading}
              isToday={bucket.date === today}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onOpenDay={handleOpenDay}
              onMove={setRescheduling}
              onDrop={handleDrop}
              onRestore={handleRestore}
            />
          ))}
        </div>
      )}

      {/* Kept mounted after the selection is spent, so a partial or failed bulk
          write is visible instead of vanishing with the bar. */}
      {(selectedIds.length > 0 || result !== null) && (
        <WeekBulkBar
          selectedCount={selectedIds.length}
          targetDate={targetDate}
          onTargetDateChange={(date) =>
            setBulkTarget({ week: startKey, date })
          }
          onMove={() => runBulk("move")}
          onDrop={() => runBulk("drop")}
          onClear={handleClearSelection}
          busy={busy}
          result={result}
        />
      )}

      <RescheduleModal
        isOpen={Boolean(rescheduling)}
        task={rescheduling}
        defaultDate={rescheduling?.date ?? today}
        onClose={() => setRescheduling(null)}
        onSubmit={handleReschedule}
      />
    </div>
  );
}
