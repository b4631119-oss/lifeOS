"use client";

import Button from "@/components/ui/button/Button";
import { formatHistoryDate, formatTimeRange } from "@/lib/date";
import {
  DROP_PATCH,
  carryTargetDate,
  isScheduled,
  limitGroups,
  type DayGroup,
} from "@/lib/taskSchedule";
import type { LifeTask, NewTask } from "@/types/lifeos";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import RescheduleModal, { type RescheduleValues } from "./RescheduleModal";

/** Rows listed before the panel points at the day arrows instead. */
const MAX_VISIBLE_TASKS = 6;

interface UnfinishedTasksPanelProps {
  groups: DayGroup[];
  /** The day on screen, so "tomorrow" means tomorrow from here. */
  dayKey: string;
  /** Rejects on failure; every action is a single, repeatable write. */
  onUpdate: (taskId: string, data: Partial<NewTask>) => Promise<void>;
  /**
   * Names the day "carry" sends a task to, when the panel is not looking at a
   * single day. The Week review passes the first day after the week it is
   * reviewing, which is not "tomorrow" on a Tuesday.
   */
  carryLabel?: string;
  /**
   * Replaces the one-line explanation when "carry" does not mean "tomorrow" —
   * the day view's wording would contradict the button next to it.
   */
  hint?: string;
  /** Replaces the "use the day arrows" hint when those arrows point at weeks. */
  hiddenHint?: string;
}

/**
 * What did not get done, and the choice of what to do about it.
 *
 * Nothing is carried automatically — every task here waits for a decision, and
 * the three options are "carry to tomorrow", "reschedule" and "drop". A dropped
 * task is not deleted: it keeps its day, its time and its history, and simply
 * stops counting against the plan.
 *
 * The list itself mirrors the day's subscription, so a task disappears from the
 * panel when Firestore confirms the write — never before, and never if the
 * write failed.
 */
export default function UnfinishedTasksPanel({
  groups,
  dayKey,
  onUpdate,
  carryLabel,
  hint,
  hiddenHint,
}: UnfinishedTasksPanelProps) {
  const t = useTranslations("today");
  const locale = useLocale();
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [rescheduling, setRescheduling] = useState<LifeTask | null>(null);

  const { groups: visibleGroups, hidden } = limitGroups(
    groups,
    MAX_VISIBLE_TASKS,
  );

  /** Disables a row's actions while its own write is in flight. */
  const withPending = async (taskId: string, action: () => Promise<void>) => {
    setPendingIds((ids) => [...ids, taskId]);
    try {
      await action();
    } finally {
      setPendingIds((ids) => ids.filter((id) => id !== taskId));
    }
  };

  const handleCarry = (task: LifeTask) => {
    // The banner above the list reports a failure; the task stays put.
    withPending(task.id, () =>
      onUpdate(task.id, { date: carryTargetDate(dayKey) }),
    ).catch(() => undefined);
  };

  const handleDrop = (task: LifeTask) => {
    withPending(task.id, () => onUpdate(task.id, DROP_PATCH)).catch(
      () => undefined,
    );
  };

  const handleReschedule = async (values: RescheduleValues) => {
    if (!rescheduling) return;
    // Errors propagate so the dialog stays open and shows its own message.
    await withPending(rescheduling.id, () => onUpdate(rescheduling.id, values));
    setRescheduling(null);
  };

  return (
    <section
      aria-labelledby="unfinished-title"
      className="mb-6 rounded-2xl border border-warning-200 bg-warning-50/40 p-5 dark:border-warning-500/30 dark:bg-warning-500/5"
    >
      <h3
        id="unfinished-title"
        className="text-theme-sm font-semibold text-gray-800 dark:text-white/90"
      >
        {t("recovery.title")}
      </h3>
      <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
        {hint ?? t("recovery.hint")}
      </p>

      <ul className="mt-4 space-y-4">
        {visibleGroups.map((group) => (
          <li key={group.date}>
            <p className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
              {formatHistoryDate(group.date, locale)}
            </p>

            <ul className="mt-2 space-y-2">
              {group.tasks.map((task) => {
                const isPending = pendingIds.includes(task.id);

                return (
                  <li
                    key={task.id}
                    className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-white/[0.03]"
                  >
                    {/* Title on its own line: three action buttons next to it
                        would squeeze a long title into two characters. */}
                    <div className="min-w-0">
                      <p className="truncate text-theme-sm text-gray-800 dark:text-white/90">
                        {task.title}
                      </p>
                      <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                        {isScheduled(task)
                          ? formatTimeRange(
                              task.startTime,
                              task.endTime,
                              locale,
                            )
                          : t("unscheduled")}
                      </p>
                    </div>

                    {/* Named, so a screen reader hears which task each action
                        acts on rather than three identical buttons. */}
                    <div
                      role="group"
                      aria-label={task.title}
                      className="mt-2 flex flex-wrap items-center gap-2"
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => handleCarry(task)}
                      >
                        {carryLabel ?? t("recovery.carry")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => setRescheduling(task)}
                      >
                        {t("recovery.reschedule")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => handleDrop(task)}
                      >
                        {t("recovery.drop")}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>

      {hidden > 0 && (
        <p className="mt-4 text-theme-xs text-gray-500 dark:text-gray-400">
          {t("recovery.hiddenCount", { count: hidden })} —{" "}
          {hiddenHint ?? t("recovery.olderHint")}
        </p>
      )}

      <RescheduleModal
        isOpen={Boolean(rescheduling)}
        task={rescheduling}
        defaultDate={dayKey}
        onClose={() => setRescheduling(null)}
        onSubmit={handleReschedule}
      />
    </section>
  );
}
