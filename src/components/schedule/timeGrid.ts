import type { LifeTask } from "@/types/lifeos";

/** A `{ startTime, endTime }` pair of `"HH:mm"` strings. */
export type TimeRange = { startTime: string; endTime: string };

/* ---------------------------------- scale ---------------------------------- */

/** Vertical scale of the timeline, in pixels per hour. */
export const PX_PER_HOUR = 56;
export const PX_PER_MINUTE = PX_PER_HOUR / 60;

/**
 * The timeline always spans the full 0:00–24:00 day.
 *
 * A narrower "waking day" window would look tidier but silently hides tasks
 * outside it (one at 05:30 could neither be seen nor dragged), which then makes
 * drag clamping dishonest. Instead the container auto-scrolls to the current
 * time and the night hours are only dimmed.
 */
export const DAY_END_MINUTES = 24 * 60;
/** Last representable minute (23:59) — `"24:00"` is not a valid `HH:mm`. */
export const DAY_LAST_MINUTE = DAY_END_MINUTES - 1;
export const DAY_HEIGHT = (DAY_END_MINUTES / 60) * PX_PER_HOUR;

/** Hours before this one are drawn as (dimmed) night. */
export const NIGHT_END_HOUR = 6;

/** Drag and click resolution, in minutes. */
export const SNAP_MINUTES = 15;

/** Length of the task created by clicking an empty slot. */
export const DEFAULT_DURATION_MINUTES = 60;

/** Hour marks rendered on the axis, `0`–`23`. */
export const HOURS = Array.from(
  { length: DAY_END_MINUTES / 60 },
  (_, hour) => hour,
);

/* -------------------------------- conversion ------------------------------- */

/** `"HH:mm"` → minutes since midnight, or `null` when unparseable. */
export function toMinutes(value: string | undefined): number | null {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

/** Minutes since midnight → `"HH:mm"`, clamped into the day. */
export function toTimeString(minutes: number): string {
  const clamped = clamp(Math.round(minutes), 0, DAY_LAST_MINUTE);
  const hours = Math.floor(clamped / 60);
  const rest = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

/** Rounds to the nearest `SNAP_MINUTES` boundary. */
export function snapMinutes(minutes: number): number {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
}

/**
 * A pointer offset from the top of the timeline → snapped minutes since
 * midnight. Used by both click-to-create and drag-to-move, so a block always
 * lands on the same grid a click would.
 */
export function offsetToMinutes(offsetPx: number): number {
  return clamp(snapMinutes(offsetPx / PX_PER_MINUTE), 0, DAY_LAST_MINUTE);
}

/** Minutes since midnight → pixels from the top of the timeline. */
export function minutesToOffset(minutes: number): number {
  return minutes * PX_PER_MINUTE;
}

/**
 * Moves a block to a new start while preserving its duration, keeping the whole
 * range inside the day.
 */
export function moveRange(
  startMinutes: number,
  durationMinutes: number,
): { startMinutes: number; endMinutes: number } {
  const duration = Math.max(SNAP_MINUTES, Math.round(durationMinutes));
  const maxStart = Math.max(0, DAY_LAST_MINUTE - duration);
  const start = clamp(snapMinutes(startMinutes), 0, maxStart);
  return { startMinutes: start, endMinutes: start + duration };
}

export function durationOf(
  task: Pick<LifeTask, "startTime" | "endTime">,
): number {
  const start = toMinutes(task.startTime);
  const end = toMinutes(task.endTime);
  if (start === null || end === null || end <= start) return SNAP_MINUTES;
  return end - start;
}

export function rangeOf(
  task: Pick<LifeTask, "startTime" | "endTime">,
): TimeRange {
  return { startTime: task.startTime, endTime: task.endTime };
}

/* --------------------------------- layout ---------------------------------- */

export type PositionedTask = {
  task: LifeTask;
  startMinutes: number;
  endMinutes: number;
  /** 0-based column inside the overlap cluster. */
  column: number;
  /** Columns in the cluster — every block is `1 / columnCount` of the track. */
  columnCount: number;
};

/**
 * Positions tasks on the timeline.
 *
 * Transitively overlapping tasks form a cluster and share the track width,
 * split into as many columns as the busiest moment of that cluster needs (the
 * familiar calendar layout). `overrides` carries optimistic drag positions so a
 * block does not snap back to its stored time while the write is in flight.
 */
export function layoutTasks(
  tasks: LifeTask[],
  overrides: Record<string, TimeRange> = {},
): PositionedTask[] {
  const positioned: PositionedTask[] = [];

  for (const task of tasks) {
    const range = overrides[task.id] ?? rangeOf(task);
    const start = toMinutes(range.startTime);
    if (start === null) continue;

    const end = toMinutes(range.endTime);
    positioned.push({
      task,
      startMinutes: start,
      endMinutes: Math.max(end ?? start + SNAP_MINUTES, start + SNAP_MINUTES),
      column: 0,
      columnCount: 1,
    });
  }

  positioned.sort(
    (a, b) => a.startMinutes - b.startMinutes || b.endMinutes - a.endMinutes,
  );

  let cluster: PositionedTask[] = [];
  let clusterEnd = -1;

  const flushCluster = () => {
    if (cluster.length === 0) return;

    // columnEnds[i] is the end of the last block placed in column i.
    const columnEnds: number[] = [];
    for (const row of cluster) {
      const free = columnEnds.findIndex((end) => end <= row.startMinutes);
      if (free === -1) {
        columnEnds.push(row.endMinutes);
        row.column = columnEnds.length - 1;
      } else {
        columnEnds[free] = row.endMinutes;
        row.column = free;
      }
    }

    for (const row of cluster) row.columnCount = columnEnds.length;
    cluster = [];
    clusterEnd = -1;
  };

  for (const row of positioned) {
    if (cluster.length > 0 && row.startMinutes >= clusterEnd) flushCluster();
    cluster.push(row);
    clusterEnd = Math.max(clusterEnd, row.endMinutes);
  }
  flushCluster();

  return positioned;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
