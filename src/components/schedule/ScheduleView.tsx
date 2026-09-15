"use client";

import type { TaskFormValues } from "@/components/today/TaskForm";
import TaskFormModal from "@/components/today/TaskFormModal";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/hooks/useModal";
import { useTodayTasks } from "@/hooks/useTodayTasks";
import { formatTimeRange } from "@/lib/date";
import type { LifeTask } from "@/types/lifeos";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useRef, useState } from "react";
import ScheduleGrid from "./ScheduleGrid";
import ScheduleHeader from "./ScheduleHeader";
import {
  DEFAULT_DURATION_MINUTES,
  PX_PER_MINUTE,
  SNAP_MINUTES,
  layoutTasks,
  moveRange,
  snapMinutes,
  toMinutes,
  toTimeString,
  type TimeRange,
} from "./timeGrid";

/** One arrow-key press moves a block by exactly one snap step. */
const STEP_PX = SNAP_MINUTES * PX_PER_MINUTE;

const verticalStepCoordinateGetter: KeyboardCoordinateGetter = (
  event,
  { currentCoordinates },
) => {
  switch (event.code) {
    case "ArrowDown":
      return { ...currentCoordinates, y: currentCoordinates.y + STEP_PX };
    case "ArrowUp":
      return { ...currentCoordinates, y: currentCoordinates.y - STEP_PX };
    default:
      return undefined;
  }
};

/**
 * The schedule for today.
 *
 * It reads and writes the very same `tasks` collection as the Today module
 * through `useTodayTasks`, so both views are already in sync in real time —
 * there is no second data path and nothing to reconcile.
 */
export default function ScheduleView() {
  const t = useTranslations("schedule");
  const locale = useLocale();
  const { user } = useAuth();
  const { tasks, loading, error, createTask, editTask } = useTodayTasks(
    user?.uid,
  );

  const sensors = useSensors(
    // A plain click must stay a click — the drag only starts after 4px.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: verticalStepCoordinateGetter,
    }),
  );

  const formModal = useModal();
  const { openModal, closeModal } = formModal;

  const [editingTask, setEditingTask] = useState<LifeTask | null>(null);
  const [slot, setSlot] = useState<TimeRange | null>(null);
  const [pending, setPending] = useState<Record<string, TimeRange>>({});
  const [moveError, setMoveError] = useState<string | null>(null);

  /**
   * Set on drag start, cleared on the next macrotask after the drop — browsers
   * fire a trailing click once a drag ends, and it must not open a modal.
   */
  const suppressClickRef = useRef(false);
  const isClickSuppressed = useCallback(() => suppressClickRef.current, []);

  /**
   * Optimistic positions, pruned as soon as the realtime snapshot catches up.
   * Derived instead of synced from an effect, so a block never flashes back to
   * its old slot while the write is in flight.
   */
  const optimistic = useMemo(() => {
    const next: Record<string, TimeRange> = {};
    for (const [id, range] of Object.entries(pending)) {
      const task = tasks.find((item) => item.id === id);
      if (!task) continue;
      if (
        task.startTime === range.startTime &&
        task.endTime === range.endTime
      ) {
        continue;
      }
      next[id] = range;
    }
    return next;
  }, [pending, tasks]);

  const rows = useMemo(
    () => layoutTasks(tasks, optimistic),
    [tasks, optimistic],
  );

  const openCreate = useCallback(
    (startTime: string, endTime: string) => {
      setEditingTask(null);
      setSlot({ startTime, endTime });
      openModal();
    },
    [openModal],
  );

  const openEdit = useCallback(
    (task: LifeTask) => {
      // The click trailing a drag lands here too.
      if (suppressClickRef.current) return;
      setEditingTask(task);
      setSlot(null);
      openModal();
    },
    [openModal],
  );

  const handleAddTask = useCallback(() => {
    const now = new Date();
    const start = snapMinutes(now.getHours() * 60 + now.getMinutes());
    openCreate(
      toTimeString(start),
      toTimeString(start + DEFAULT_DURATION_MINUTES),
    );
  }, [openCreate]);

  const handleDragStart = () => {
    suppressClickRef.current = true;
  };

  const handleDragEnd = ({ active, delta }: DragEndEvent) => {
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);

    const task = tasks.find((item) => item.id === String(active.id));
    if (!task) return;

    // Move from the *effective* position (optimistic included), so a second
    // drag before the snapshot lands still starts from what the user sees.
    const base = optimistic[task.id] ?? {
      startTime: task.startTime,
      endTime: task.endTime,
    };
    const baseStart = toMinutes(base.startTime);
    if (baseStart === null) return;

    const baseEnd = toMinutes(base.endTime) ?? baseStart;
    const duration = Math.max(baseEnd - baseStart, SNAP_MINUTES);
    const { startMinutes, endMinutes } = moveRange(
      baseStart + delta.y / PX_PER_MINUTE,
      duration,
    );

    // Unmoved drags (including plain clicks) must not write anything.
    if (startMinutes === baseStart) return;

    const range: TimeRange = {
      startTime: toTimeString(startMinutes),
      endTime: toTimeString(endMinutes),
    };

    setPending((prev) => ({ ...prev, [task.id]: range }));
    setMoveError(null);

    editTask(task.id, range).catch(() => {
      setPending((prev) => {
        const next = { ...prev };
        delete next[task.id];
        return next;
      });
      setMoveError(t("errors.move"));
    });
  };

  const describe = useCallback(
    (id: string | number) => {
      const task = tasks.find((item) => item.id === String(id));
      if (!task) return { title: "", range: "" };
      return {
        title: task.title,
        range: formatTimeRange(task.startTime, task.endTime, locale),
      };
    },
    [tasks, locale],
  );

  const announcements = useMemo<Announcements>(
    () => ({
      onDragStart: ({ active }) => t("dragging", describe(active.id)),
      // Staying silent between passes keeps the screen reader usable.
      onDragOver: () => undefined,
      onDragEnd: ({ active }) => t("dropped", describe(active.id)),
      onDragCancel: ({ active }) => t("dragCancelled", describe(active.id)),
    }),
    [t, describe],
  );

  const handleSubmit = async (values: TaskFormValues) => {
    if (editingTask) {
      await editTask(editingTask.id, values);
    } else {
      await createTask(values);
    }
    closeModal();
  };

  return (
    <div>
      <ScheduleHeader
        taskCount={tasks.length}
        loading={loading}
        onAddTask={handleAddTask}
      />

      {error && (
        <div className="mb-6 rounded-lg border border-error-500/30 bg-error-50 px-4 py-3 text-theme-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {t("errors.load")}
        </div>
      )}

      {moveError && (
        <div className="mb-6 rounded-lg border border-error-500/30 bg-error-50 px-4 py-3 text-theme-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {moveError}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            {t("loading")}
          </p>
        </div>
      ) : (
        <>
          {tasks.length === 0 && (
            <div className="mb-6 rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-6 text-center dark:border-gray-700 dark:bg-white/3">
              <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                {t("emptyTitle")}
              </p>
              <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
                {t("emptyMessage")}
              </p>
            </div>
          )}

          <p className="mb-3 text-theme-xs text-gray-500 dark:text-gray-400">
            {t("dragHint")}
          </p>

          <DndContext
            sensors={sensors}
            // Blocks move along the timeline only, and never past the day's
            // edges — the drop handler clamps again for good measure.
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            accessibility={{
              announcements,
              screenReaderInstructions: { draggable: t("dragInstructions") },
            }}
          >
            <ScheduleGrid
              rows={rows}
              onCreateAt={openCreate}
              onEdit={openEdit}
              isClickSuppressed={isClickSuppressed}
            />
          </DndContext>
        </>
      )}

      <TaskFormModal
        isOpen={formModal.isOpen}
        onClose={closeModal}
        task={editingTask}
        onSubmit={handleSubmit}
        defaultStartTime={slot?.startTime}
        defaultEndTime={slot?.endTime}
      />
    </div>
  );
}
