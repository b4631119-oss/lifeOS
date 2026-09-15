"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import type { Habit } from "@/types/lifeos";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface HabitRenameFormProps {
  habit: Habit;
  onSubmit: (name: string) => Promise<void>;
  onCancel: () => void;
}

export default function HabitRenameForm({
  habit,
  onSubmit,
  onCancel,
}: HabitRenameFormProps) {
  const t = useTranslations("habits");
  const [name, setName] = useState(habit.name);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError(t("nameRequired"));
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await onSubmit(name);
    } catch {
      setError(t("errors.save"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="habit-rename">{t("habitName")}</Label>
        <Input
          id="habit-rename"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t("habitNamePlaceholder")}
          error={Boolean(error) && !name.trim()}
        />
      </div>

      {error && <p className="text-theme-sm text-error-500">{error}</p>}

      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" size="sm" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
