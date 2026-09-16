"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { isValidDateKey } from "@/lib/date";
import type { BulkResult } from "@/hooks/useWeekTasks";
import { useTranslations } from "next-intl";
import { useId } from "react";

interface WeekBulkBarProps {
  selectedCount: number;
  /** The day the selected tasks are moved to. */
  targetDate: string;
  onTargetDateChange: (date: string) => void;
  onMove: () => void;
  onDrop: () => void;
  onClear: () => void;
  busy: boolean;
  /** What the last bulk action actually did, or `null` before the first one. */
  result: BulkResult | null;
}

/**
 * The bar that appears while tasks are selected, and stays afterwards to report
 * what the bulk action did.
 *
 * Deliberately only two actions — move the selected tasks to a day, or take
 * them off the plan — because those are the two decisions a week's leftovers
 * need, and because everything else about a task is edited in one place (Today,
 * or the task dialog). Every write is a plain patch per task, so a task that
 * fails to move stays exactly where it was and the bar says how many moved
 * rather than claiming the whole selection did.
 *
 * The report outlives the selection: a bulk action clears the selection, so if
 * the bar only existed while something was selected, "2 of 5 could not be saved"
 * would be unmounted in the same render that produced it.
 */
export default function WeekBulkBar({
  selectedCount,
  targetDate,
  onTargetDateChange,
  onMove,
  onDrop,
  onClear,
  busy,
  result,
}: WeekBulkBarProps) {
  const t = useTranslations("week");
  const tToday = useTranslations("today");
  const dateId = useId();

  const validDate = isValidDateKey(targetDate);

  // With nothing selected the bar has become a report, so the controls that
  // only make sense for a live selection are gone rather than disabled.
  const selecting = selectedCount > 0;

  const resultMessage = () => {
    if (!result) return null;
    if (result.updated === 0) {
      return result.action === "move" ? t("bulk.failedMove") : t("bulk.failedDrop");
    }
    if (result.failed > 0) {
      return t("bulk.partial", { done: result.updated, total: result.total });
    }
    return result.action === "move"
      ? t("bulk.moved", { count: result.updated })
      : t("bulk.dropped", { count: result.updated });
  };

  const message = resultMessage();

  // Nothing to select and nothing to report: the bar has no reason to exist.
  if (!selecting && !message) return null;

  return (
    <div className="sticky bottom-4 z-20 mt-6 rounded-2xl border border-brand-200 bg-white p-4 shadow-theme-md dark:border-brand-500/40 dark:bg-gray-900">
      {selecting ? (
        <div className="flex flex-wrap items-end gap-3">
          <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
            {t("bulk.selected", { count: selectedCount })}
          </p>

          <div className="min-w-40 flex-1">
            <Label htmlFor={dateId}>{t("bulk.date")}</Label>
            <Input
              id={dateId}
              type="date"
              value={targetDate}
              onChange={(event) => onTargetDateChange(event.target.value)}
              error={!validDate}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={onMove} disabled={busy || !validDate}>
              {t("bulk.move")}
            </Button>
            <Button size="sm" variant="outline" onClick={onDrop} disabled={busy}>
              {tToday("recovery.drop")}
            </Button>
            <Button size="sm" variant="outline" onClick={onClear} disabled={busy}>
              {t("bulk.clear")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* The report is the whole bar here, so it is what gets announced. */}
          <p
            className="text-theme-sm text-gray-800 dark:text-white/90"
            role="status"
          >
            {message}
          </p>
          <Button size="sm" variant="outline" onClick={onClear}>
            {t("bulk.dismiss")}
          </Button>
        </div>
      )}

      {selecting && !validDate && (
        <p className="mt-2 text-theme-xs text-error-500" role="alert">
          {tToday("recovery.rescheduleDateRequired")}
        </p>
      )}

      {selecting && message && (
        <p
          className="mt-2 text-theme-xs text-gray-600 dark:text-gray-300"
          role="status"
        >
          {message}
        </p>
      )}
    </div>
  );
}
