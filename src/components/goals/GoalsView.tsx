"use client";

import ConfirmModal from "@/components/common/ConfirmModal";
import ErrorBanner from "@/components/common/ErrorBanner";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useAuth } from "@/context/AuthContext";
import { useGoals } from "@/hooks/useGoals";
import { useGoalTasks } from "@/hooks/useGoalTasks";
import { useModal } from "@/hooks/useModal";
import { useTodayKey } from "@/hooks/useTodayKey";
import { splitGoalsByStatus } from "@/lib/goals";
import type { Goal, GoalStatus, NewGoal } from "@/types/lifeos";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import GoalCard from "./GoalCard";
import GoalEmptyState from "./GoalEmptyState";
import GoalForm from "./GoalForm";

/** A goal with nothing linked still needs a stable bucket to render from. */
const NO_TASKS: never[] = [];

export default function GoalsView() {
  const t = useTranslations("goals");
  const { user } = useAuth();
  const today = useTodayKey();
  const { goals, loading, error, createGoal, updateGoal, deleteGoal, reload } =
    useGoals(user?.uid);

  const goalIds = useMemo(() => goals.map((goal) => goal.id), [goals]);
  const { tasksByGoal, loading: tasksLoading } = useGoalTasks(
    user?.uid,
    goalIds,
  );

  const deleteModal = useModal();
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const { active, finished } = splitGoalsByStatus(goals);

  const handleDeleteRequest = (goal: Goal) => {
    setGoalToDelete(goal);
    deleteModal.openModal();
  };

  const handleConfirmDelete = async () => {
    if (!goalToDelete) return;
    await deleteGoal(goalToDelete.id);
    deleteModal.closeModal();
    setGoalToDelete(null);
  };

  const handleCreateGoal = async (data: Omit<NewGoal, "createdAt">) => {
    await createGoal(data);
    setShowForm(false);
  };

  const handleUpdateGoal = async (data: Partial<NewGoal>) => {
    if (!editingGoal) return;
    // Only the fields the form owns are written. `GoalForm` submits a full
    // `NewGoal`, and passing its empty `subtasks` list through would wipe the
    // legacy steps the goal still carries.
    await updateGoal(editingGoal.id, {
      title: data.title,
      description: data.description,
      deadline: data.deadline,
    });
    setEditingGoal(null);
    setShowForm(false);
  };

  const handleStatusChange = async (goal: Goal, status: GoalStatus) => {
    // Status lives on the goal alone — the tasks linked to it are untouched, so
    // archiving a direction never removes the work already done for it.
    await updateGoal(goal.id, { status });
  };

  const handleEditRequest = (goal: Goal) => {
    setEditingGoal(goal);
    setShowForm(true);
  };

  const renderCard = (goal: Goal) => (
    <GoalCard
      key={goal.id}
      goal={goal}
      tasks={tasksByGoal[goal.id] ?? NO_TASKS}
      today={today}
      // Progress numbers wait for the linked tasks to answer, so a goal is
      // never briefly labelled "no linked tasks" while its work is in flight.
      tasksLoaded={!tasksLoading}
      onEditRequest={handleEditRequest}
      onDeleteRequest={handleDeleteRequest}
      onStatusChange={handleStatusChange}
    />
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <PageBreadcrumb pageTitle={t("title")} />
        <button
          type="button"
          onClick={() => {
            setEditingGoal(null);
            setShowForm(true);
          }}
          className="rounded-lg bg-brand-500 px-4 py-2 text-theme-sm font-medium text-white transition-colors hover:bg-brand-600"
        >
          + {t("addGoal")}
        </button>
      </div>

      <p className="mb-4 hidden text-theme-sm text-gray-500 sm:mb-6 sm:block dark:text-gray-400">
        {t("subtitle")}
      </p>

      {error && <ErrorBanner message={t("errors.load")} onRetry={reload} />}

      {showForm && (
        <div className="mb-6">
          <GoalForm
            onSubmit={editingGoal ? handleUpdateGoal : handleCreateGoal}
            initialData={editingGoal ?? undefined}
            isEditing={!!editingGoal}
          />
        </div>
      )}

      {goals.length === 0 && !showForm && !loading && (
        <GoalEmptyState onAddGoal={() => setShowForm(true)} />
      )}

      {active.length > 0 && (
        <ul className="space-y-4">{active.map(renderCard)}</ul>
      )}

      {finished.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-theme-sm font-semibold text-gray-700 dark:text-gray-300">
            {t("finishedSection")}
          </h2>
          <p className="mb-4 text-theme-xs text-gray-500 dark:text-gray-400">
            {t("finishedSectionHint")}
          </p>
          <ul className="space-y-4">{finished.map(renderCard)}</ul>
        </section>
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        namespace="goals"
        subjectKey="title"
        subject={goalToDelete?.title ?? null}
        onClose={deleteModal.closeModal}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
