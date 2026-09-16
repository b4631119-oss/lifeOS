"use client";

import { useTranslations } from "next-intl";
import { useState, FormEvent } from "react";
import type { NewGoal } from "@/types/lifeos";

interface GoalFormProps {
  onSubmit: (goal: Omit<NewGoal, "createdAt">) => Promise<void>;
  initialData?: Partial<NewGoal>;
  isEditing?: boolean;
}

export default function GoalForm({
  onSubmit,
  initialData,
  isEditing = false,
}: GoalFormProps) {
  const t = useTranslations("goals");
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [deadline, setDeadline] = useState(initialData?.deadline ?? "");
  const [titleError, setTitleError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitleError(true);
      return;
    }
    setTitleError(false);
    setSubmitting(true);
    try {
      // A new goal starts active, with no legacy steps — the only work that
      // moves it forward is a task linked to it.
      await onSubmit({
        title: trimmedTitle,
        description,
        deadline,
        status: "active",
        subtasks: [],
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <h3 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
        {isEditing ? t("edit") : t("addGoal")}
      </h3>
      <div className="mt-4 space-y-4">
        <div>
          <label
            htmlFor="goal-title"
            className="block text-theme-xs font-medium text-gray-700 dark:text-gray-300"
          >
            {t("goalTitle")} <span className="text-error-500">*</span>
          </label>
          <input
            type="text"
            id="goal-title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setTitleError(false);
            }}
            placeholder={t("goalTitlePlaceholder")}
            className={`mt-1.5 block w-full rounded-lg border px-3.5 py-2.5 text-theme-sm transition-colors ${
              titleError
                ? "border-error-500 focus:border-error-500 focus:ring-error-500"
                : "border-gray-300 focus:border-brand-500 focus:ring-brand-500 dark:border-gray-700 dark:bg-white/5"
            }`}
            disabled={submitting}
          />
          {titleError && (
            <p className="mt-1.5 text-theme-xs text-error-500">{t("titleRequired")}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="goal-description"
            className="block text-theme-xs font-medium text-gray-700 dark:text-gray-300"
          >
            {t("description")}
          </label>
          <textarea
            id="goal-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("descriptionPlaceholder")}
            rows={3}
            className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-theme-sm transition-colors focus:border-brand-500 focus:ring-brand-500 dark:border-gray-700 dark:bg-white/5"
            disabled={submitting}
          />
        </div>

        <div>
          <label
            htmlFor="goal-deadline"
            className="block text-theme-xs font-medium text-gray-700 dark:text-gray-300"
          >
            {t("deadline")} <span className="text-gray-400">{t("deadlineOptional")}</span>
          </label>
          <input
            type="date"
            id="goal-deadline"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-theme-sm transition-colors focus:border-brand-500 focus:ring-brand-500 dark:border-gray-700 dark:bg-white/5"
            disabled={submitting}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              setTitle(initialData?.title ?? "");
              setDescription(initialData?.description ?? "");
              setDeadline(initialData?.deadline ?? "");
              setTitleError(false);
            }}
            className="rounded-lg border border-gray-300 px-4 py-2 text-theme-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
            disabled={submitting}
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            className="rounded-lg bg-brand-500 px-4 py-2 text-theme-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? t("saving") : isEditing ? t("update") : t("create")}
          </button>
        </div>
      </div>
    </form>
  );
}