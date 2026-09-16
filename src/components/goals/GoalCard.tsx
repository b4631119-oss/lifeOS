"use client";

import Badge from "@/components/ui/badge/Badge";
import { ShootingStarIcon } from "@/icons";
import { Link, useRouter } from "@/i18n/navigation";
import { formatTimeRange } from "@/lib/date";
import {
  goalProgressOf,
  goalStatusOf,
  nextActionFor,
} from "@/lib/goals";
import { isScheduled } from "@/lib/taskSchedule";
import type { Goal, GoalStatus, LifeTask } from "@/types/lifeos";
import { useLocale, useTranslations } from "next-intl";
import GoalActionsMenu, { type GoalAction } from "./GoalActionsMenu";

const STATUS_COLORS: Record<GoalStatus, "primary" | "success" | "light"> = {
  active: "primary",
  completed: "success",
  archived: "light",
};

interface GoalCardProps {
  goal: Goal;
  /** The tasks linked to this goal (already loaded by the list). */
  tasks: LifeTask[];
  /** Today, for ordering the next action. */
  today: string;
  /**
   * True once the linked tasks have answered at least once.
   *
   * Progress is a count of real work, so it stays unshown while that work is
   * still loading — a goal must never read "no linked tasks yet" just because
   * its query is in flight.
   */
  tasksLoaded: boolean;
  onEditRequest: (goal: Goal) => void;
  onDeleteRequest: (goal: Goal) => void;
  /** Moves the goal between active, completed and archived. */
  onStatusChange: (goal: Goal, status: GoalStatus) => void;
}

/**
 * One goal, in terms of the work that moves it.
 *
 * Progress is "3 of 7 tasks completed" — a count of linked tasks, never a
 * percentage of the goal being reached, because the app has no model of what
 * reaching it would mean. A goal with nothing linked says so instead of showing
 * a zero: "no linked tasks yet" is the honest reading of a goal nobody has
 * turned into work.
 */
export default function GoalCard({
  goal,
  tasks,
  today,
  tasksLoaded,
  onEditRequest,
  onDeleteRequest,
  onStatusChange,
}: GoalCardProps) {
  const t = useTranslations("goals");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const status = goalStatusOf(goal);
  const progress = goalProgressOf(tasks);
  const nextAction = nextActionFor(tasks, today);
  const legacySteps = goal.subtasks.length;
  const percent =
    progress.total === 0
      ? 0
      : Math.round((progress.done / progress.total) * 100);

  const statusAction: GoalAction[] =
    status === "active"
      ? [
          {
            key: "complete",
            label: t("markComplete"),
            onSelect: () => onStatusChange(goal, "completed"),
          },
          {
            key: "archive",
            label: t("archive"),
            onSelect: () => onStatusChange(goal, "archived"),
          },
        ]
      : status === "completed"
        ? [
            {
              key: "reopen",
              label: t("reopen"),
              onSelect: () => onStatusChange(goal, "active"),
            },
            {
              key: "archive",
              label: t("archive"),
              onSelect: () => onStatusChange(goal, "archived"),
            },
          ]
        : [
            {
              key: "restore",
              label: t("restore"),
              onSelect: () => onStatusChange(goal, "active"),
            },
          ];

  return (
    <li className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <ShootingStarIcon className="h-5 w-5 shrink-0 text-brand-500" />
            <h3 className="min-w-0 truncate text-theme-sm font-semibold text-gray-800 dark:text-white/90">
              {/* The title is the way in: the goal page is where the work is. */}
              <Link
                href={`/goals/${goal.id}`}
                aria-label={t("openGoal", { title: goal.title })}
                className="rounded-sm hover:text-brand-600 focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden dark:hover:text-brand-400"
              >
                {goal.title}
              </Link>
            </h3>
            <Badge size="sm" color={STATUS_COLORS[status]}>
              {/* One wording for a goal's state, shared with the task form's
                  goal selector — not two keys that can drift apart. */}
              {tCommon(`goalStatuses.${status}`)}
            </Badge>
          </div>

          {goal.description && (
            <p className="mt-1.5 line-clamp-2 text-theme-xs text-gray-500 dark:text-gray-400">
              {goal.description}
            </p>
          )}

          {goal.deadline && (
            <p className="mt-1.5 text-theme-xs text-gray-400 dark:text-gray-500">
              {t("deadlineLabel")} {goal.deadline}
            </p>
          )}
        </div>

        <GoalActionsMenu
          label={t("moreOptions")}
          actions={[
            {
              key: "open",
              label: t("open"),
              onSelect: () => router.push(`/goals/${goal.id}`),
            },
            {
              key: "edit",
              label: t("edit"),
              onSelect: () => onEditRequest(goal),
            },
            ...statusAction,
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
        {!tasksLoaded ? (
          <p className="text-theme-xs text-gray-400 dark:text-gray-500">
            {t("loading")}
          </p>
        ) : progress.total > 0 ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <span className="text-theme-xs font-medium text-gray-700 dark:text-gray-300">
                {t("taskProgress")}
              </span>
              <span className="text-theme-xs text-gray-500 dark:text-gray-400">
                {t("tasksCompleted", {
                  done: progress.done,
                  total: progress.total,
                })}
              </span>
            </div>
            <div
              className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800"
              role="progressbar"
              aria-valuemin={0}
              // The scale is tasks, not percent: "3 of 6" is what this measures,
              // and it is also what a screen reader is told.
              aria-valuemax={progress.total}
              aria-valuenow={progress.done}
              aria-valuetext={t("tasksCompleted", {
                done: progress.done,
                total: progress.total,
              })}
            >
              <div
                className="h-full bg-brand-500 transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
          </>
        ) : (
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">
            {t("noLinkedTasks")}
          </p>
        )}
      </div>

      {tasksLoaded && nextAction && (
        <div className="mt-4 rounded-xl bg-gray-50 px-3 py-2.5 dark:bg-white/[0.03]">
          <p className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
            {t("nextAction")}
          </p>
          <p className="mt-0.5 truncate text-theme-sm text-gray-800 dark:text-white/90">
            {nextAction.title}
          </p>
          <p className="text-theme-xs text-gray-400 dark:text-gray-500">
            {isScheduled(nextAction)
              ? formatTimeRange(
                  nextAction.startTime,
                  nextAction.endTime,
                  locale,
                )
              : t("noTimeSet")}
          </p>
        </div>
      )}

      {legacySteps > 0 && (
        <p className="mt-4 text-theme-xs text-gray-500 dark:text-gray-400">
          {t("legacySteps", { count: legacySteps })}{" "}
          <Link
            href={`/goals/${goal.id}`}
            className="font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700 dark:text-brand-400"
          >
            {t("legacyStepsAction")}
          </Link>
        </p>
      )}
    </li>
  );
}
