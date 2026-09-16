"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

interface HabitFormProps {
  onSubmit: (name: string) => Promise<void>;
}

export default function HabitForm({ onSubmit }: HabitFormProps) {
  const t = useTranslations("habits");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      setError(t("nameRequired"));
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await onSubmit(name);
      setName("");
    } catch {
      setError(t("errors.save"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
    >
      <Label htmlFor="habit-name">{t("habitName")}</Label>

      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-50 flex-1">
          <Input
            id="habit-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("habitNamePlaceholder")}
            error={Boolean(error)}
          />
        </div>
        <Button size="sm" type="submit" disabled={isSubmitting}>
          {t("addHabit")}
        </Button>
      </div>

      {error && <p className="mt-2 text-theme-sm text-error-500">{error}</p>}
    </form>
  );
}
