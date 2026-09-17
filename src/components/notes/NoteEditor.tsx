"use client";

import TextArea from "@/components/form/input/TextArea";
import Button from "@/components/ui/button/Button";
import type { SaveState } from "@/hooks/useNotes";
import { TrashBinIcon } from "@/icons";
import { formatClock } from "@/lib/date";
import { cn } from "@/utils";
import { useTranslations } from "next-intl";

interface NoteEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Persists the pending text immediately when the field loses focus. */
  onBlur: () => void;
  saveState: SaveState;
  savedAt: number | null;
  locale: string;
  /**
   * Deletes this day's note. Omitted when the day has no note on the server, so
   * the control is only ever offered for something that exists — an empty day
   * has nothing to remove, and there is no way to "delete" text that was never
   * saved.
   */
  onDeleteRequest?: () => void;
}

export default function NoteEditor({
  value,
  onChange,
  onBlur,
  saveState,
  savedAt,
  locale,
  onDeleteRequest,
}: NoteEditorProps) {
  const t = useTranslations("notes");

  const statusLabel =
    saveState === "saving"
      ? t("status.saving")
      : saveState === "error"
        ? t("status.error")
        : saveState === "saved" && savedAt
          ? t("status.saved", { time: formatClock(new Date(savedAt), locale) })
          : t("status.idle");

  return (
    <div className="space-y-4">
      <TextArea
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        rows={8}
        placeholder={t("placeholder")}
        className="resize-y text-gray-700 dark:text-gray-300"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
        <p
          aria-live="polite"
          className={cn(
            "text-theme-xs",
            saveState === "error"
              ? "text-error-500"
              : "text-gray-500 dark:text-gray-400",
          )}
        >
          {statusLabel}
        </p>

        {onDeleteRequest && (
          <Button
            variant="outline"
            size="sm"
            type="button"
            startIcon={<TrashBinIcon className="h-4 w-4" />}
            onClick={onDeleteRequest}
          >
            {t("deleteCurrent")}
          </Button>
        )}
      </div>
    </div>
  );
}
