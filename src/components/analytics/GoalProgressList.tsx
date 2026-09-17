"use client";

import Badge from "@/components/ui/badge/Badge";
import type { GoalWork } from "@/lib/analytics";
import type { GoalStatus } from "@/types/lifeos";
import { useTranslations } from "next-intl";

const STATUS_COLORS: Record<GoalStatus, "primary" | "success" | "light"> = {
  active: "primary",
  completed: "success",
  archived: "light",
};

interface GoalProgressListProps {
  goals: GoalWork[];
}

/**
 * The window's work, grouped by the goal it belongs to.
 *
 * "3 of 7 completed" — the same wording the goal card uses, and for the same
 * reason: it counts linked tasks, and never claims to be a share of the goal
 * itself. Tasks with no goal are simply absent, so nothing here suggests every
 * task should have one.
 *
 * A completed or archived goal keeps its badge: it had work in this window, and
 * showing it without its status would read as a goal that is still going.
 */
export default function GoalProgressList({ goals }: GoalProgressListProps) {
  const t = useTranslations("analytics.goals");
  const tStatus = useTranslations("common.goalStatuses");

  if (goals.length === 0) {
    return (
      <p className="py-6 text-center text-theme-sm text-gray-400 dark:text-gray-500">
        {t("none")}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
      {goals.map((goal) => (
        <li
          key={goal.id}
          className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
        >
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {goal.title}
            </p>
            {goal.status !== "active" && (
              // `whitespace-nowrap` is inherited: a two-word status label would
              // otherwise break inside its own pill on a phone.
              <span className="shrink-0 whitespace-nowrap">
                <Badge size="sm" color={STATUS_COLORS[goal.status]}>
                  {tStatus(goal.status)}
                </Badge>
              </span>
            )}
          </div>
          <p className="shrink-0 text-theme-xs text-gray-500 dark:text-gray-400">
            {t("progress", { done: goal.completed, planned: goal.planned })}
          </p>
        </li>
      ))}
    </ul>
  );
}
