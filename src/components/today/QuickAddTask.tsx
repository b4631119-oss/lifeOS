"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { useCaptureField } from "@/hooks/useCaptureField";
import { PlusIcon } from "@/icons";
import { TEXT_ACTION_HIT_AREA } from "@/lib/touchTarget";
import { cn } from "@/utils";
import { useTranslations } from "next-intl";

interface QuickAddTaskProps {
  /** Rejects on failure; the field keeps the text so nothing is lost. */
  onCreate: (title: string) => Promise<unknown>;
  /**
   * Opens the full task dialog, carrying whatever is already typed, for a task
   * that needs a time, a goal or a priority from the start.
   *
   * Deliberately a quiet text action rather than a second filled button: there
   * is one way to add a task, and one way to add a *detailed* one. Omitting it
   * leaves the field as capture only (the goal page does that).
   */
  onOpenDetails?: (title: string) => void;
  /**
   * Name of the day the field writes to, when it is not today.
   *
   * The day arrows can move the whole view to another date, and a captured task
   * silently landing on a day the user is not looking at is exactly the kind of
   * hidden state a capture field must not have.
   */
  dayLabel?: string;
  /** False when the host already renders its own heading above the field. */
  showLabel?: boolean;
}

/**
 * Capture-first task entry — the one way a task is added from a whole day.
 *
 * A real form with a single field: type a title, press Enter, keep typing. No
 * time, no status, no modal — scheduling is a separate, optional step that the
 * task can be given later (or never). This is the fastest way to get something
 * out of your head and into the day, which is the whole point of the field.
 */
export default function QuickAddTask({
  onCreate,
  onOpenDetails,
  dayLabel,
  showLabel = true,
}: QuickAddTaskProps) {
  const t = useTranslations("today");
  const field = useCaptureField(onCreate);

  const hint = dayLabel
    ? t("quickAddHintOtherDay", { date: dayLabel })
    : t("quickAddHint");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void field.submit();
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      {/* Named in the open, because this is the primary action of the screen —
          the day is for adding to before it is for reading. */}
      <Label
        htmlFor="quick-add-title"
        className={showLabel ? undefined : "sr-only"}
      >
        {t("addTask")}
      </Label>

      <div className="flex items-center gap-2">
        {/* The field wrapper is min-w-0 so a long title cannot push the
            button off a narrow screen. */}
        <div className="min-w-0 flex-1">
          <Input
            id="quick-add-title"
            value={field.value}
            onChange={(event) => field.setValue(event.target.value)}
            placeholder={t("taskTitlePlaceholder")}
            error={field.failed}
            autoComplete="off"
            maxLength={200}
          />
        </div>
        <Button
          type="submit"
          size="sm"
          startIcon={<PlusIcon />}
          disabled={!field.ready || field.saving}
          className="shrink-0"
        >
          {t("quickAdd")}
        </Button>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-theme-xs">
        <p
          className={
            field.failed
              ? "text-error-500"
              : "text-gray-500 dark:text-gray-400"
          }
          role={field.failed ? "alert" : undefined}
        >
          {field.failed ? t("errors.save") : hint}
        </p>

        {onOpenDetails && (
          <button
            type="button"
            onClick={() => onOpenDetails(field.value.trim())}
            /* A 44px hit area rather than a bare 30px line of text: the label
               stays compact and unfilled — the filled button beside the field
               is still the primary action — but the target a thumb has to find
               is the size a target has to be. */
            className={cn(
              TEXT_ACTION_HIT_AREA,
              "rounded font-medium text-brand-600 transition-colors hover:text-brand-700 hover:underline focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden dark:text-brand-400 dark:hover:text-brand-300",
            )}
          >
            {t("addWithDetails")}
          </button>
        )}
      </div>
    </form>
  );
}
