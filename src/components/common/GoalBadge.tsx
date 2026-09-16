"use client";

import { ShootingStarIcon } from "@/icons";
import { Link } from "@/i18n/navigation";
import type { Goal } from "@/types/lifeos";
import { useTranslations } from "next-intl";

interface GoalBadgeProps {
  /** The id stored on the task, if any. */
  goalId?: string;
  /** The goal it resolves to, once the goals have loaded. */
  goal?: Goal;
  /**
   * True once the goals list has answered at least once. Until then a missing
   * goal means \"still loading\", not \"deleted\" — guessing would label a task
   * wrongly for a moment every time the page opens.
   */
  resolved: boolean;
}

/**
 * The link between a task and the goal it moves forward.
 *
 * A real link, not a clickable `<span>`: it takes the keyboard, announces where
 * it goes, and opens the goal. When the goal is gone the same badge turns into
 * plain text — the task keeps working, and nothing pretends the link is still
 * there.
 */
export default function GoalBadge({ goalId, goal, resolved }: GoalBadgeProps) {
  const t = useTranslations("common");

  if (!goalId) return null;

  if (!goal) {
    if (!resolved) return null;

    return (
      <span
        className="inline-flex max-w-[12rem] items-center gap-1 truncate rounded-full bg-gray-100 px-2.5 py-0.5 text-theme-xs text-gray-500 dark:bg-white/5 dark:text-gray-400"
        title={t("goalRemoved")}
      >
        <ShootingStarIcon className="h-3 w-3 shrink-0 opacity-60" />
        <span className="truncate">{t("goalRemoved")}</span>
      </span>
    );
  }

  return (
    <Link
      href={`/goals/${goal.id}`}
      aria-label={t("openGoal", { title: goal.title })}
      className="inline-flex max-w-[14rem] items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-theme-xs font-medium text-brand-600 transition-colors hover:bg-brand-100 focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden dark:bg-brand-500/15 dark:text-brand-300 dark:hover:bg-brand-500/25"
    >
      <ShootingStarIcon className="h-3 w-3 shrink-0" />
      <span className="truncate">{goal.title}</span>
    </Link>
  );
}
