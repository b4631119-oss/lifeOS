"use client";

import ConfirmModal from "@/components/common/ConfirmModal";
import ErrorBanner from "@/components/common/ErrorBanner";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useAuth } from "@/context/AuthContext";
import { useHabits } from "@/hooks/useHabits";
import { useModal } from "@/hooks/useModal";
import { addDays, dateKey, parseDateKey } from "@/lib/date";
import { GRID_DAYS, GRID_WEEKS } from "@/lib/habits";
import type { Habit } from "@/types/lifeos";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import ArchivedHabits from "./ArchivedHabits";
import HabitForm from "./HabitForm";
import HabitList from "./HabitList";
import HabitRenameModal from "./HabitRenameModal";

export default function HabitsView() {
  const t = useTranslations("habits");
  const { user } = useAuth();
  const {
    activeHabits,
    archivedHabits,
    doneDatesByHabit,
    today,
    loading,
    error,
    createHabit,
    renameHabit,
    setHabitActive,
    toggleHabit,
    deleteHabit,
    reload,
  } = useHabits(user?.uid);

  const renameModal = useModal();
  const deleteModal = useModal();
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [habitToDelete, setHabitToDelete] = useState<Habit | null>(null);

  // The 12 week grid window, oldest day first. Derived from the reactive day
  // (`useHabits` re-reads `useTodayKey`), so the window slides at midnight
  // instead of ending on yesterday until the next reload.
  const gridDates = useMemo(() => {
    const end = parseDateKey(today);
    const dates: string[] = [];

    for (let offset = GRID_DAYS - 1; offset >= 0; offset -= 1) {
      dates.push(dateKey(addDays(end, -offset)));
    }

    return dates;
  }, [today]);

  const handleRenameRequest = (habit: Habit) => {
    setEditingHabit(habit);
    renameModal.openModal();
  };

  const handleRename = async (name: string) => {
    if (!editingHabit) return;
    await renameHabit(editingHabit.id, name);
    renameModal.closeModal();
    setEditingHabit(null);
  };

  const handleDeleteRequest = (habit: Habit) => {
    setHabitToDelete(habit);
    deleteModal.openModal();
  };

  const handleConfirmDelete = async () => {
    if (!habitToDelete) return;
    await deleteHabit(habitToDelete.id);
    deleteModal.closeModal();
    setHabitToDelete(null);
  };

  return (
    <div>
      <PageBreadcrumb pageTitle={t("title")} />

      <p className="mb-6 text-theme-sm text-gray-500 dark:text-gray-400">
        {t("subtitle")}
      </p>

      <div className="mb-6">
        <HabitForm onSubmit={createHabit} />
      </div>

      {error && <ErrorBanner message={t("errors.load")} onRetry={reload} />}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-theme-xs text-gray-500 dark:text-gray-400">
          {t("activityTitle", { weeks: GRID_WEEKS })}
        </span>
        <span className="flex items-center gap-2 text-theme-xs text-gray-500 dark:text-gray-400">
          <span className="h-3 w-3 rounded-[3px] bg-gray-200 dark:bg-gray-800" />
          {t("legendMissed")}
          <span className="h-3 w-3 rounded-[3px] bg-brand-500" />
          {t("legendDone")}
        </span>
      </div>

      <HabitList
        habits={activeHabits}
        doneDatesByHabit={doneDatesByHabit}
        gridDates={gridDates}
        today={today}
        loading={loading}
        onToggle={toggleHabit}
        onArchive={(habitId) => setHabitActive(habitId, false)}
        onRename={handleRenameRequest}
        onDelete={handleDeleteRequest}
      />

      <ArchivedHabits
        habits={archivedHabits}
        onReactivate={(habitId) => setHabitActive(habitId, true)}
        onRename={handleRenameRequest}
        onDelete={handleDeleteRequest}
      />

      <HabitRenameModal
        isOpen={renameModal.isOpen}
        habit={editingHabit}
        onClose={renameModal.closeModal}
        onSubmit={handleRename}
      />

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        namespace="habits"
        subjectKey="name"
        subject={habitToDelete?.name ?? null}
        onClose={deleteModal.closeModal}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
