"use client";

import { Modal } from "@/components/ui/modal";
import type { Habit } from "@/types/lifeos";
import { useTranslations } from "next-intl";
import { useId } from "react";
import HabitRenameForm from "./HabitRenameForm";

interface HabitRenameModalProps {
  isOpen: boolean;
  habit: Habit | null;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}

export default function HabitRenameModal({
  isOpen,
  habit,
  onClose,
  onSubmit,
}: HabitRenameModalProps) {
  const t = useTranslations("habits");
  const headingId = useId();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy={headingId}
      className="m-4 max-w-md p-6 sm:p-8"
    >
      <h3
        id={headingId}
        className="mb-6 text-title-sm font-semibold text-gray-800 dark:text-white/90"
      >
        {t("renameTitle")}
      </h3>

      {/* Remount per habit so the input starts from the selected habit's name. */}
      {habit && (
        <HabitRenameForm
          key={habit.id}
          habit={habit}
          onSubmit={onSubmit}
          onCancel={onClose}
        />
      )}
    </Modal>
  );
}
