"use client";

import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { useTranslations } from "next-intl";

interface NoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  /** Colours the heading; `success` is the default for a completed action. */
  tone?: "success" | "error";
}

/**
 * Reports an outcome that needs no decision — the dialog counterpart of the
 * `alert()` calls that used to interrupt the goal page.
 */
export default function NoticeModal({
  isOpen,
  onClose,
  title,
  message,
  tone = "success",
}: NoticeModalProps) {
  const t = useTranslations("common");

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="m-4 max-w-md p-6 sm:p-8">
      <h3
        className={`text-title-sm font-semibold ${
          tone === "error"
            ? "text-error-500"
            : "text-gray-800 dark:text-white/90"
        }`}
      >
        {title}
      </h3>
      <p className="mt-3 text-theme-sm text-gray-500 dark:text-gray-400">
        {message}
      </p>

      <div className="mt-6 flex items-center justify-end">
        <Button variant="outline" size="sm" onClick={onClose}>
          {t("close")}
        </Button>
      </div>
    </Modal>
  );
}
