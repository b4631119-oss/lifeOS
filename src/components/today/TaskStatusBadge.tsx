"use client";

import Badge from "@/components/ui/badge/Badge";
import type { TaskStatus } from "@/types/lifeos";
import { useTranslations } from "next-intl";

const STATUS_COLORS: Record<TaskStatus, "light" | "warning" | "success"> = {
  todo: "light",
  in_progress: "warning",
  done: "success",
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "statuses.todo",
  in_progress: "statuses.in_progress",
  done: "statuses.done",
};

interface TaskStatusBadgeProps {
  status: TaskStatus;
}

export default function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const t = useTranslations("today");

  return (
    <Badge size="sm" color={STATUS_COLORS[status]}>
      {t(STATUS_LABELS[status])}
    </Badge>
  );
}
