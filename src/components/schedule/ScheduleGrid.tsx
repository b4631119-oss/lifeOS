"use client";

import type { Goal, LifeTask } from "@/types/lifeos";
import { useEffect, useRef } from "react";
import NowIndicator from "./NowIndicator";
import ScheduleTaskBlock from "./ScheduleTaskBlock";
import TimeAxis from "./TimeAxis";
import { minutesOfDay, useNowMs } from "@/hooks/useNowMs";
import {
  DAY_HEIGHT,
  DEFAULT_DURATION_MINUTES,
  HOURS,
  NIGHT_END_HOUR,
  PX_PER_HOUR,
  PX_PER_MINUTE,
  offsetToMinutes,
  toTimeString,
  type PositionedTask,
} from "./timeGrid";

interface ScheduleGridProps {
  rows: PositionedTask[];
  /** The user's goals by id, for the goal context on a block. */
  goalsById: Record<string, Goal>;
  /** Opens the create form with the clicked slot's times. */
  onCreateAt: (startTime: string, endTime: string) => void;
  onEdit: (task: LifeTask) => void;
  /** True right after a drag, when the trailing click must be ignored. */
  isClickSuppressed: () => boolean;
}

export default function ScheduleGrid({
  rows,
  goalsById,
  onCreateAt,
  onEdit,
  isClickSuppressed,
}: ScheduleGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const focusDoneRef = useRef(false);
  const nowMs = useNowMs();

  // The scale is the full 24h, so reveal the part of the day that matters on
  // first paint instead of dropping the user into the 0:00 night.
  useEffect(() => {
    if (focusDoneRef.current || nowMs === null) return;
    const container = scrollRef.current;
    if (!container) return;
    focusDoneRef.current = true;

    const now = minutesOfDay(nowMs);
    const firstTask = rows.reduce(
      (earliest, row) => Math.min(earliest, row.startMinutes),
      now,
    );
    container.scrollTop = Math.max(
      0,
      Math.min(now, firstTask) * PX_PER_MINUTE - container.clientHeight / 3,
    );
  }, [nowMs, rows]);

  const handleTrackClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isClickSuppressed()) return;
    const track = trackRef.current;
    if (!track) return;

    const { top } = track.getBoundingClientRect();
    const startMinutes = offsetToMinutes(event.clientY - top);
    onCreateAt(
      toTimeString(startMinutes),
      toTimeString(startMinutes + DEFAULT_DURATION_MINUTES),
    );
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
      <div
        ref={scrollRef}
        className="custom-scrollbar max-h-[70vh] overflow-y-auto"
      >
        <div className="flex">
          <TimeAxis />

          <div
            ref={trackRef}
            onClick={handleTrackClick}
            className="relative min-w-0 flex-1 border-s border-gray-200 dark:border-gray-800"
            style={{ height: DAY_HEIGHT }}
          >
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute inset-x-0 border-t border-gray-100 dark:border-gray-800/60"
                style={{ top: hour * PX_PER_HOUR }}
              />
            ))}

            {/* Night is dimmed, never hidden: the scale stays honest. */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 bg-gray-50/70 dark:bg-gray-900/40"
              style={{ height: NIGHT_END_HOUR * PX_PER_HOUR }}
            />

            {rows.map((row) => (
              <ScheduleTaskBlock
                key={row.task.id}
                row={row}
                goal={row.task.goalId ? goalsById[row.task.goalId] : undefined}
                onEdit={onEdit}
              />
            ))}

            {nowMs !== null && <NowIndicator minutes={minutesOfDay(nowMs)} />}
          </div>
        </div>
      </div>
    </div>
  );
}
