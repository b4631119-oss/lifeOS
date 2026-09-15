"use client";

import { CheckLineIcon, PencilIcon, TrashBinIcon, ShootingStarIcon } from "@/icons";
import { cn } from "@/utils";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import type { Goal, GoalSubtask } from "@/types/lifeos";
import GoalActionsMenu from "./GoalActionsMenu";

interface GoalCardProps {
  goal: Goal;
  /** Opens the edit form in the parent, seeded with this goal. */
  onEditRequest: (goal: Goal) => void;
  /** Opens the parent's delete confirmation modal. */
  onDeleteRequest: (goal: Goal) => void;
  onDecompose: (goal: Goal) => Promise<void>;
  onToggleSubtask: (goalId: string, subtaskId: string, done: boolean) => Promise<void>;
  onAddSubtask: (goalId: string, title: string) => Promise<void>;
  onDeleteSubtask: (goalId: string, subtaskId: string) => Promise<void>;
  onEditSubtask: (goalId: string, subtaskId: string, title: string) => Promise<void>;
}

export default function GoalCard({
  goal,
  onEditRequest,
  onDeleteRequest,
  onDecompose,
  onToggleSubtask,
  onAddSubtask,
  onDeleteSubtask,
  onEditSubtask,
}: GoalCardProps) {
  const t = useTranslations("goals");
  const [showAllSubtasks, setShowAllSubtasks] = useState(false);
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newSubtaskError, setNewSubtaskError] = useState(false);

  const completedCount = goal.subtasks.filter((s) => s.done).length;
  const totalCount = goal.subtasks.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const displaySubtasks = useMemo(() => {
    if (showAllSubtasks || goal.subtasks.length <= 5) {
      return goal.subtasks;
    }
    return goal.subtasks.slice(0, 5);
  }, [goal.subtasks, showAllSubtasks]);

  const handleAddSubtask = async () => {
    const trimmed = newSubtaskTitle.trim();
    if (!trimmed) {
      setNewSubtaskError(true);
      return;
    }
    setNewSubtaskError(false);
    await onAddSubtask(goal.id, trimmed);
    setNewSubtaskTitle("");
    setAddingSubtask(false);
  };

  const handleEditSubtask = async (subtask: GoalSubtask) => {
    const trimmed = editTitle.trim();
    if (!trimmed) return;
    await onEditSubtask(goal.id, subtask.id, trimmed);
    setEditingSubtaskId(null);
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    await onDeleteSubtask(goal.id, subtaskId);
  };

  const handleToggle = async (subtask: GoalSubtask) => {
    await onToggleSubtask(goal.id, subtask.id, !subtask.done);
  };

  return (
    <li className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <ShootingStarIcon className="h-5 w-5 text-brand-500" />
            <h3 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90 truncate">
              {goal.title}
            </h3>
          </div>
          {goal.description && (
            <p className="mt-1.5 text-theme-xs text-gray-500 dark:text-gray-400 line-clamp-2">
              {goal.description}
            </p>
          )}
          {goal.deadline && (
            <div className="mt-1.5 flex items-center gap-1.5 text-theme-xs text-gray-400 dark:text-gray-500">
              <span className="relative top-0.5">
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              <span>{goal.deadline}</span>
            </div>
          )}
        </div>

        <GoalActionsMenu
          label={t("moreOptions")}
          actions={[
            {
              key: "decompose",
              label: t("decomposeAi"),
              onSelect: () => onDecompose(goal),
            },
            {
              key: "edit",
              label: t("edit"),
              onSelect: () => onEditRequest(goal),
            },
            {
              key: "delete",
              label: t("delete"),
              onSelect: () => onDeleteRequest(goal),
              destructive: true,
            },
          ]}
        />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <span className="text-theme-xs font-medium text-gray-700 dark:text-gray-300">
            {t("progress")} {progress}%
          </span>
          <span className="text-theme-xs text-gray-500 dark:text-gray-400">
            {completedCount} / {totalCount} {t("subtasks")}
          </span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
          <div
            className="h-full bg-brand-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <h4 className="text-theme-xs font-medium text-gray-700 dark:text-gray-300">
            {t("subtasks")}
          </h4>
          <button
            type="button"
            onClick={() => setAddingSubtask(true)}
            className="text-theme-xs text-brand-500 hover:text-brand-600 font-medium"
          >
            + {t("addSubtask")}
          </button>
        </div>

        {addingSubtask && (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => {
                setNewSubtaskTitle(e.target.value);
                setNewSubtaskError(false);
              }}
              placeholder={t("subtaskTitlePlaceholder")}
              className={`flex-1 rounded-lg border px-3 py-2 text-theme-sm ${
                newSubtaskError
                  ? "border-error-500 focus:border-error-500 focus:ring-error-500"
                  : "border-gray-300 focus:border-brand-500 focus:ring-brand-500 dark:border-gray-700 dark:bg-white/5"
              }`}
            />
            <button
              type="button"
              onClick={handleAddSubtask}
              className="rounded-lg bg-brand-500 px-3 py-2 text-theme-xs font-medium text-white hover:bg-brand-600"
            >
              {t("create")}
            </button>
            <button
              type="button"
              onClick={() => setAddingSubtask(false)}
              className="rounded-lg px-3 py-2 text-theme-xs font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
            >
              {t("cancel")}
            </button>
          </div>
        )}

        {goal.subtasks.length === 0 && !addingSubtask && (
          <p className="mt-3 text-theme-xs text-gray-400 dark:text-gray-500 text-center py-4">
            {t("noSubtasks")}
          </p>
        )}

        <ul className="mt-3 space-y-2">
          {displaySubtasks.map((subtask) => (
            <li key={subtask.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleToggle(subtask)}
                aria-pressed={subtask.done}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors"
                aria-label={subtask.done ? t("markTodo") : t("markDone")}
              >
                {subtask.done ? (
                  <CheckLineIcon className="h-3.5 w-3.5 text-white" />
                ) : null}
              </button>
              {editingSubtaskId === subtask.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleEditSubtask(subtask)}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-theme-sm focus:border-brand-500 focus:ring-brand-500 dark:border-gray-700 dark:bg-white/5"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => handleEditSubtask(subtask)}
                    className="text-brand-500 hover:text-brand-600 text-theme-xs"
                  >
                    {t("save")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingSubtaskId(null)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-theme-xs"
                  >
                    {t("cancel")}
                  </button>
                </div>
              ) : (
                <>
                  <span
                    className={cn(
                      "flex-1 text-theme-sm truncate",
                      subtask.done
                        ? "line-through text-gray-400 dark:text-gray-500"
                        : "text-gray-800 dark:text-white/90",
                    )}
                    onDoubleClick={() => {
                      setEditingSubtaskId(subtask.id);
                      setEditTitle(subtask.title);
                    }}
                  >
                    {subtask.title}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSubtaskId(subtask.id);
                        setEditTitle(subtask.title);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      aria-label={t("edit")}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSubtask(subtask.id)}
                      className="p-1 text-gray-400 hover:text-error-500"
                      aria-label={t("delete")}
                    >
                      <TrashBinIcon className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>

        {!showAllSubtasks && goal.subtasks.length > 5 && (
          <button
            type="button"
            onClick={() => setShowAllSubtasks(true)}
            className="mt-2 w-full rounded-lg border border-gray-200 py-2 text-theme-xs text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
          >
            {t("viewMore", { count: goal.subtasks.length - 5 })}
          </button>
        )}
      </div>
    </li>
  );
}