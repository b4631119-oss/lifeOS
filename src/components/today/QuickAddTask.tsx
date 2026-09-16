"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { PlusIcon } from "@/icons";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface QuickAddTaskProps {
  /** Rejects on failure; the field keeps the text so nothing is lost. */
  onCreate: (title: string) => Promise<void>;
}

/**
 * Capture-first task entry.
 *
 * A real form with a single field: type a title, press Enter, keep typing. No
 * time, no status, no modal — scheduling is a separate, optional step that the
 * task can be given later (or never). This is the fastest way to get something
 * out of your head and into the day, which is the whole point of the field.
 */
export default function QuickAddTask({ onCreate }: QuickAddTaskProps) {
  const t = useTranslations("today");
  const [title, setTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = title.trim();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Guards a double submit (Enter held down, or a double click) — the write
    // must not create the task twice.
    if (!trimmed || isSaving) return;

    setIsSaving(true);
    setError(null);

    try {
      await onCreate(trimmed);
      // Cleared only after the write lands, so a failure never eats the text.
      setTitle("");
    } catch {
      setError(t("errors.save"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <Label htmlFor="quick-add-title" className="sr-only">
        {t("taskTitle")}
      </Label>

      <div className="flex items-center gap-2">
        {/* The field wrapper is min-w-0 so a long title cannot push the
            button off a narrow screen. */}
        <div className="min-w-0 flex-1">
          <Input
            id="quick-add-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t("quickAddPlaceholder")}
            error={Boolean(error)}
            autoComplete="off"
            maxLength={200}
          />
        </div>
        <Button
          type="submit"
          size="sm"
          startIcon={<PlusIcon />}
          disabled={!trimmed || isSaving}
          className="shrink-0"
        >
          {t("quickAdd")}
        </Button>
      </div>

      <p
        className={
          error
            ? "mt-1.5 text-theme-xs text-error-500"
            : "mt-1.5 text-theme-xs text-gray-500 dark:text-gray-400"
        }
        role={error ? "alert" : undefined}
      >
        {error ?? t("quickAddHint")}
      </p>
    </form>
  );
}
