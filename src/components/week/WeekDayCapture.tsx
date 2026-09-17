"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { useCaptureField } from "@/hooks/useCaptureField";
import { PlusIcon } from "@/icons";
import { formatDayLabel, parseDateKey } from "@/lib/date";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";

interface WeekDayCaptureProps {
  /** `YYYY-MM-DD` — the day every task written here belongs to. */
  date: string;
  /** Writes one title to this day. Rejects when the write fails. */
  onCreate: (title: string) => Promise<unknown>;
}

/**
 * Planning one day of the week: a title, and the day is already decided.
 *
 * The card knows which day it is, so the user is never asked to pick a date a
 * second time — that is the whole difference between planning a week and
 * filling in a form. It is the same capture as Today's (shared
 * `useCaptureField`), only smaller: one field, one button, no hint and no time
 * fields, because a week is planned in short bursts and every one of these sits
 * inside a card a seventh of the screen wide.
 *
 * Detailed planning is not lost, it is just later: the task appears under the
 * day it was written into as the same row every other task gets, and giving it
 * a time, a goal or a priority stays where that already lives — the row's own
 * actions, and the day view.
 */
export default function WeekDayCapture({
  date,
  onCreate,
}: WeekDayCaptureProps) {
  const t = useTranslations("week");
  const tToday = useTranslations("today");
  const locale = useLocale();
  const field = useCaptureField(onCreate);
  const inputId = useId();
  const [open, setOpen] = useState(false);

  const dayLabel = formatDayLabel(parseDateKey(date), locale);
  const label = t("addToDayAria", { date: dayLabel });

  if (!open) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="w-full"
        startIcon={<PlusIcon />}
        aria-label={label}
        onClick={() => setOpen(true)}
      >
        {t("addToDay")}
      </Button>
    );
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void field.submit();
  };

  /**
   * Clicking away from an untouched field closes it; clicking away with a title
   * typed in it must not, or the words would be thrown away by an accidental
   * click. Focus moving *inside* the form (to the Add button) is not leaving it.
   */
  const handleBlur = (event: React.FocusEvent<HTMLFormElement>) => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    if (!field.value.trim()) {
      field.reset();
      setOpen(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      onBlur={handleBlur}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        field.reset();
        setOpen(false);
      }}
    >
      <Label htmlFor={inputId} className="sr-only">
        {label}
      </Label>

      {/* Wrapping rather than shrinking: a card is a seventh of a wide screen
          and a third of a tablet one, so the field is given a floor (nine
          characters or so) and the button moves to its own line instead of
          squeezing the place the user actually types into. */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-36 flex-1">
          <Input
            id={inputId}
            value={field.value}
            onChange={(event) => field.setValue(event.target.value)}
            placeholder={tToday("taskTitlePlaceholder")}
            error={field.failed}
            autoComplete="off"
            maxLength={200}
            autoFocus
          />
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={!field.ready || field.saving}
          className="shrink-0"
        >
          {tToday("quickAdd")}
        </Button>
      </div>

      {field.failed && (
        <p className="mt-1.5 text-theme-xs text-error-500" role="alert">
          {t("errors.save")}
        </p>
      )}
    </form>
  );
}
