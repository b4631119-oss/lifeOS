"use client";

import { useTranslations } from "next-intl";
import { CloseIcon } from "@/icons";

interface DeleteGoalModalProps {
  isOpen: boolean;
  goalTitle: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteGoalModal({
  isOpen,
  goalTitle,
  onClose,
  onConfirm,
}: DeleteGoalModalProps) {
  const t = useTranslations("goals");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-gray-900">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-theme-md font-semibold text-gray-800 dark:text-white/90">
              {t("deleteTitle")}
            </h3>
            <p className="mt-1.5 text-theme-sm text-gray-500 dark:text-gray-400">
              {goalTitle ? t("deleteMessage", { title: goalTitle }) : t("deleteMessage", { title: "" })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-theme-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-error-500 px-4 py-2 text-theme-sm font-medium text-white transition-colors hover:bg-error-600"
          >
            {t("delete")}
          </button>
        </div>
      </div>
    </div>
  );
}