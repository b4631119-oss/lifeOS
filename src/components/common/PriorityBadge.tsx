"use client";

import Badge from "@/components/ui/badge/Badge";
import { DEFAULT_PRIORITY, priorityOf } from "@/lib/taskSchedule";
import type { LifeTask } from "@/types/lifeos";
import { useTranslations } from "next-intl";

interface PriorityBadgeProps {
  task: Pick<LifeTask, "priority">;
}

/**
 * A task's priority, shown only when it is *not* the default.
 *
 * Medium is what a task is unless told otherwise, so badging every one of them
 * would be noise; high and low are the two the user actually chose, and they
 * are the only two worth a reader's attention.
 */
export default function PriorityBadge({ task }: PriorityBadgeProps) {
  const t = useTranslations("common");
  const priority = priorityOf(task);

  if (priority === DEFAULT_PRIORITY) return null;

  return (
    <Badge size="sm" color={priority === "high" ? "warning" : "light"}>
      {t(`priorities.${priority}`)}
    </Badge>
  );
}
