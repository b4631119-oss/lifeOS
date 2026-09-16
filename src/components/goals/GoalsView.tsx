"use client";

import ConfirmModal from "@/components/common/ConfirmModal";
import ErrorBanner from "@/components/common/ErrorBanner";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useAuth } from "@/context/AuthContext";
import { useGoals } from "@/hooks/useGoals";
import { useModal } from "@/hooks/useModal";
import type { Goal, NewGoal } from "@/types/lifeos";
import { useTranslations } from "next-intl";
import { useState } from "react";
import GoalCard from "./GoalCard";
import GoalForm from "./GoalForm";
import GoalEmptyState from "./GoalEmptyState";

export default function GoalsView() {
  const t = useTranslations("goals");
  const { user } = useAuth();
  const {
    goals,
    loading,
    error,
    createGoal,
    updateGoal,
    deleteGoal,
    reload,
  } = useGoals(user?.uid);

  const deleteModal = useModal();
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
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
    // `GoalForm` submits a full `NewGoal`, whose empty `subtasks` list would
    // wipe the subtasks already on the goal (those are edited on the card).
    await updateGoal(editingGoal.id, {
      title: data.title,
      description: data.description,
      deadline: data.deadline,
    });
    setEditingGoal(null);
    setShowForm(false);
  };

  const handleEditRequest = (goal: Goal) => {
    setEditingGoal(goal);
    setShowForm(true);
  };

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

      <p className="mb-6 text-theme-sm text-gray-500 dark:text-gray-400">
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

      {goals.length > 0 && (
        <ul className="space-y-4">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEditRequest={handleEditRequest}
              onDeleteRequest={handleDeleteRequest}
              onToggleSubtask={async (goalId, subtaskId, done) => {
                const goal = goals.find((g) => g.id === goalId);
                if (!goal) return;
                const updatedSubtasks = goal.subtasks.map((s) =>
                  s.id === subtaskId ? { ...s, done } : s
                );
                await updateGoal(goalId, { subtasks: updatedSubtasks });
              }}
              onAddSubtask={async (goalId, title) => {
                const goal = goals.find((g) => g.id === goalId);
                if (!goal) return;
                const newSubtask = {
                  id: crypto.randomUUID(),
                  title,
                  done: false,
                };
                await updateGoal(goalId, { subtasks: [...goal.subtasks, newSubtask] });
              }}
              onDeleteSubtask={async (goalId, subtaskId) => {
                const goal = goals.find((g) => g.id === goalId);
                if (!goal) return;
                const updatedSubtasks = goal.subtasks.filter((s) => s.id !== subtaskId);
                await updateGoal(goalId, { subtasks: updatedSubtasks });
              }}
              onEditSubtask={async (goalId, subtaskId, title) => {
                const goal = goals.find((g) => g.id === goalId);
                if (!goal) return;
                const updatedSubtasks = goal.subtasks.map((s) =>
                  s.id === subtaskId ? { ...s, title } : s
                );
                await updateGoal(goalId, { subtasks: updatedSubtasks });
              }}
            />
          ))}
        </ul>
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