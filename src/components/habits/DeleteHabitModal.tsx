"use client";

import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface DeleteHabitModalProps {
  isOpen: boolean;
  habitName: string | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function DeleteHabitModal({
  isOpen,
  habitName,
  onClose,
  onConfirm,
}: DeleteHabitModalProps) {
  const t = useTranslations("habits");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      await onConfirm();
    } catch {
      setError(t("errors.delete"));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="m-4 max-w-md p-6 sm:p-8">
      <h3 className="text-title-sm font-semibold text-gray-800 dark:text-white/90">
        {t("deleteTitle")}
      </h3>
      <p className="mt-3 text-theme-sm text-gray-500 dark:text-gray-400">
        {t("deleteMessage", { name: habitName ?? "" })}
      </p>

      {error && <p className="mt-3 text-theme-sm text-error-500">{error}</p>}

      <div className="mt-6 flex items-center justify-end gap-3">
        <Button variant="outline" size="sm" onClick={onClose}>
          {t("cancel")}
        </Button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isDeleting}
          className="inline-flex items-center justify-center rounded-lg bg-error-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-error-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("delete")}
        </button>
      </div>
    </Modal>
  );
}
