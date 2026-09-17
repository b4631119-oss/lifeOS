"use client";

import Badge from "@/components/ui/badge/Badge";
import type { TaskStatus } from "@/types/lifeos";
import { useTranslations } from "next-intl";

const STATUS_COLORS: Record<TaskStatus, "light" | "info" | "success"> = {
  todo: "light",
  // Blue, not amber: amber is the priority axis (see `PriorityBadge`), and two
  // pills of the same colour in one row read as one thing. In progress is the
  // only status that means "this is moving right now", so it gets its own hue.
  in_progress: "info",
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

/**
 * A task's status, shown only when the row cannot already show it.
 *
 * `todo` is the state of ordinary open work, and the row says so itself (an
 * empty circle, a title that is not struck through). Badging it is the noise
 * that made every Today row carry a "To do" pill, so it renders nothing —
 * exactly what the Week view does, so one status no longer looks like two
 * things depending on the screen.
 */
export default function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const t = useTranslations("today");

  if (status === "todo") return null;

  return (
    <Badge size="sm" color={STATUS_COLORS[status]}>
      {t(STATUS_LABELS[status])}
    </Badge>
  );
}
