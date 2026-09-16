"use client";

import TextArea from "@/components/form/input/TextArea";
import type { SaveState } from "@/hooks/useNotes";
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
}

export default function NoteEditor({
  value,
  onChange,
  onBlur,
  saveState,
  savedAt,
  locale,
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
    </div>
  );
}
