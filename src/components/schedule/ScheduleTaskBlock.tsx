"use client";

import { useDraggable } from "@dnd-kit/core";
import { ShootingStarIcon } from "@/icons";
import { formatTimeRange } from "@/lib/date";
import type { Goal, LifeTask } from "@/types/lifeos";
import { cn } from "@/utils";
import { useLocale, useTranslations } from "next-intl";
import {
  minutesToOffset,
  PX_PER_MINUTE,
  type PositionedTask,
} from "./timeGrid";

/** Very short tasks (15 min ≈ 14px) would be unreadable — and undraggable. */
const MIN_BLOCK_HEIGHT = 24;
/** Below this the time range is dropped and only the title fits. */
const COMPACT_BLOCK_HEIGHT = 44;
/** Below this the block is too short for a third line, so the goal is left out. */
const GOAL_LINE_MIN_HEIGHT = 62;
/** Gap between neighbouring columns / the track edge. */
const CARD_GAP_PX = 4;

const STATUS_STYLES: Record<LifeTask["status"], string> = {
  todo: "border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-300 dark:hover:bg-brand-500/25",
  in_progress:
    "border-warning-200 bg-warning-50 text-warning-700 hover:bg-warning-100 dark:border-warning-500/30 dark:bg-warning-500/15 dark:text-orange-400 dark:hover:bg-warning-500/25",
  done: "border-success-200 bg-success-50 text-success-700 hover:bg-success-100 dark:border-success-500/30 dark:bg-success-500/15 dark:text-success-500 dark:hover:bg-success-500/25",
};

interface ScheduleTaskBlockProps {
  row: PositionedTask;
  /** The goal this task moves forward, when it is linked and still exists. */
  goal?: Goal;
  onEdit: (task: LifeTask) => void;
}

/**
 * One draggable task on the timeline.
 *
 * The outermost element keeps the block's real geometry and is itself the drag
 * node, so the `restrictToParentElement` modifier (configured on the context)
 * measures against the whole 24h track rather than a tight wrapper. A click
 * opens the edit modal — the drag only starts after a few pixels of movement
 * (see the sensor's activation constraint), so a click is never a drag.
 */
export default function ScheduleTaskBlock({
  row,
  goal,
  onEdit,
}: ScheduleTaskBlockProps) {
  const t = useTranslations("schedule");
  const locale = useLocale();
  const { task } = row;

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id });

  const blockHeight = Math.max(
    (row.endMinutes - row.startMinutes) * PX_PER_MINUTE,
    MIN_BLOCK_HEIGHT,
  );
  const compact = blockHeight < COMPACT_BLOCK_HEIGHT;
  const showGoal = Boolean(goal) && blockHeight >= GOAL_LINE_MIN_HEIGHT;
  const timeRange = formatTimeRange(task.startTime, task.endTime, locale);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(event) => {
        // Keep the click from reaching the track, which would open the
        // create-task form for the slot underneath this block.
        event.stopPropagation();
        onEdit(task);
      }}
      // The goal is part of the accessible name, not only of the drawn text:
      // an `aria-label` overrides the block's content for a screen reader.
      aria-label={
        showGoal && goal
          ? t("blockLabelGoal", {
              title: task.title,
              range: timeRange,
              goal: goal.title,
            })
          : t("blockLabel", { title: task.title, range: timeRange })
      }
      style={{
        top: minutesToOffset(row.startMinutes),
        height: blockHeight,
        insetInlineStart: `${(row.column / row.columnCount) * 100}%`,
        // Shave the column gap off the inline size instead of using padding, so
        // neighbouring cards keep a visible gutter without touching borders.
        inlineSize: `calc(${100 / row.columnCount}% - ${CARD_GAP_PX}px)`,
        transform: transform
          ? `translate3d(0, ${transform.y}px, 0)`
          : undefined,
      }}
      className={cn(
        // Touch-action is left at `manipulation`, not fully suppressed: the
        // block has to stay swipeable so the day can be scrolled by dragging
        // over it, while a press-and-hold is what starts the drag on touch
        // (see the TouchSensor in `ScheduleView`).
        "absolute z-10 cursor-grab touch-manipulation rounded-lg border px-2 py-1 text-start transition-colors select-none focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden active:cursor-grabbing",
        "flex flex-col justify-center overflow-hidden",
        STATUS_STYLES[task.status],
        task.status === "done" && "opacity-70",
        isDragging && "z-30 cursor-grabbing opacity-95 shadow-theme-lg",
      )}
    >
      <p
        className={cn(
          "truncate text-xs font-medium",
          task.status === "done" && "line-through",
        )}
      >
        {task.title}
      </p>
      {!compact && (
        <p className="truncate text-[11px] opacity-80">{timeRange}</p>
      )}
      {showGoal && goal && (
        <p className="flex items-center gap-1 truncate text-[11px] opacity-70">
          <ShootingStarIcon className="h-2.5 w-2.5 shrink-0" />
          <span className="truncate">{goal.title}</span>
        </p>
      )}
    </div>
  );
}
