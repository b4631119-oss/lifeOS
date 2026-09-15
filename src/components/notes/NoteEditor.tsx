"use client";

import TextArea from "@/components/form/input/TextArea";
import Button from "@/components/ui/button/Button";
import type { SaveState } from "@/hooks/useNotes";
import { ShootingStarIcon } from "@/icons";
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
  summarizing: boolean;
  onSummarize: () => Promise<void>;
}

export default function NoteEditor({
  value,
  onChange,
  onBlur,
  saveState,
  savedAt,
  locale,
  summarizing,
  onSummarize,
}: NoteEditorProps) {
  const t = useTranslations("notes");
  const isEmpty = value.trim().length === 0;

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

      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Autosave is silent by nature, so it reports itself here. */}
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

        <div className="flex flex-col items-end gap-1.5">
          <Button
            size="sm"
            onClick={() => void onSummarize()}
            disabled={isEmpty || summarizing}
            startIcon={<ShootingStarIcon className="h-4 w-4" />}
          >
            {summarizing ? t("summarizing") : t("summarize")}
          </Button>
          {isEmpty && (
            <p className="text-theme-xs text-gray-400 dark:text-gray-500">
              {t("summarizeHint")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
