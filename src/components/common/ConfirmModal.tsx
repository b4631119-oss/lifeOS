"use client";

import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

/**
 * The modules that own a `deleteTitle` / `deleteMessage` / `cancel` / `delete`
 * set of keys.
 */
export type ConfirmNamespace = "today" | "goals" | "habits" | "notes";

interface ConfirmModalProps {
  isOpen: boolean;
  /** Module whose translations supply the copy. */
  namespace: ConfirmNamespace;
  /** Which placeholder `deleteMessage` interpolates: `{title}`, `{name}` or `{date}`. */
  subjectKey: "title" | "name" | "date";
  /** What is being deleted, for the message. */
  subject: string | null;
  onClose: () => void;
  /** Rejecting shows the module's `errors.delete` message and keeps the dialog open. */
  onConfirm: () => Promise<void>;
}

/**
 * The single destructive-confirmation dialog, replacing four near-identical
 * copies (one of which had no error handling and hand-rolled its own overlay).
 * Only the wording differs per module, so it stays in the module's namespace.
 */
export default function ConfirmModal({
  isOpen,
  namespace,
  subjectKey,
  subject,
  onClose,
  onConfirm,
}: ConfirmModalProps) {
  const t = useTranslations(namespace);
  const headingId = useId();
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy={headingId}
      className="m-4 max-w-md p-6 sm:p-8"
    >
      <h3
        id={headingId}
        className="text-title-sm font-semibold text-gray-800 dark:text-white/90"
      >
        {t("deleteTitle")}
      </h3>
      <p className="mt-3 text-theme-sm text-gray-500 dark:text-gray-400">
        {t("deleteMessage", { [subjectKey]: subject ?? "" })}
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
