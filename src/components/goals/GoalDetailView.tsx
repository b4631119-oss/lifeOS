"use client";

import ErrorBanner from "@/components/common/ErrorBanner";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useAuth } from "@/context/AuthContext";
import { useGoalDetail } from "@/hooks/useGoalDetail";
import { useTodayKey } from "@/hooks/useTodayKey";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import GoalDetail from "./GoalDetail";

/**
 * One goal, wired to the data: the goal document, the tasks linked to it, and
 * the writes this page performs. The rendering lives in `GoalDetail`, which is
 * a pure function of that data.
 */
export default function GoalDetailView({ goalId }: { goalId: string }) {
  const t = useTranslations("goals");
  const { user } = useAuth();
  const today = useTodayKey();
  const {
    goal,
    loaded,
    tasks,
    loading,
    error,
    actionError,
    createTask,
    toggleTask,
    removeTask,
    setStatus,
    moveSubtasks,
    reload,
  } = useGoalDetail(user?.uid, goalId);

  if (!loaded) {
    return (
      <div>
        <PageBreadcrumb pageTitle={t("title")} />
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
          {t("loading")}
        </p>
      </div>
    );
  }

  // Deleted in another tab, or a stale link. The linked tasks are untouched and
  // still listed on their own days — only this page has nothing left to show.
  if (!goal) {
    return (
      <div>
        <PageBreadcrumb pageTitle={t("title")} />
        <div className="app-card app-card-pad">
          <h2 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
            {t("notFoundTitle")}
          </h2>
          <p className="mt-2 text-theme-sm text-gray-500 dark:text-gray-400">
            {t("notFoundMessage")}
          </p>
          <Link
            href="/goals"
            className="mt-4 inline-block text-theme-sm font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700 dark:text-brand-400"
          >
            {t("backToList")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle={goal.title} />

      {error && <ErrorBanner message={t("errors.load")} onRetry={reload} />}

      <GoalDetail
        goal={goal}
        tasks={tasks}
        loading={loading}
        actionError={Boolean(actionError)}
        today={today}
        onSetStatus={setStatus}
        onToggleTask={toggleTask}
        onRemoveTask={removeTask}
        onCreateTask={createTask}
        onMoveSubtasks={moveSubtasks}
      />
    </div>
  );
}
