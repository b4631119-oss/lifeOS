/**
 * Fixtures for the TEMPORARY visual QA harness (see `page.tsx`).
 *
 * Screens live behind Google sign-in, so the components are rendered with these
 * samples instead. Deliberately awkward data: long Russian title, mixed
 * languages, every status and priority, scheduled and unscheduled rows.
 */
import type { Timestamp } from "firebase/firestore";

import type { Goal, Habit, LifeTask } from "@/types/lifeos";

export const TODAY = "2026-09-16";
export const YESTERDAY = "2026-09-15";

export function task(
  id: string,
  title: string,
  date: string,
  overrides: Partial<LifeTask> = {},
): LifeTask {
  return {
    id,
    title,
    startTime: "",
    endTime: "",
    status: "todo",
    priority: "medium",
    date,
    createdAt: null,
    ...overrides,
  };
}

export const GOALS: Goal[] = [
  {
    id: "g1",
    title: "Launch the product before the end of the quarter",
    description: "",
    deadline: "2026-09-30",
    status: "active",
    subtasks: [],
    createdAt: null,
  },
];

export const TASKS: LifeTask[] = [
  task(
    "t1",
    "Позвонить клиенту и обсудить условия продления контракта",
    TODAY,
    {
      startTime: "09:00",
      endTime: "10:30",
      goalId: "g1",
      priority: "high",
    },
  ),
  task("t2", "Купить молоко", TODAY, {
    status: "in_progress",
    priority: "low",
  }),
  task("t3", "Write the launch email", TODAY, { status: "done", goalId: "g1" }),
  task("t4", "Review the copy with the team", TODAY, {
    startTime: "14:00",
    endTime: "15:00",
  }),
  task("y1", "Ship the docs", YESTERDAY, { goalId: "g1", priority: "high" }),
];

export const UNFINISHED = [
  {
    date: YESTERDAY,
    tasks: [
      task("y1", "Ship the docs", YESTERDAY, { priority: "high" }),
      task("y2", "Очень длинное название задачи, которое должно переноситься", YESTERDAY, {
        startTime: "11:00",
        endTime: "12:00",
      }),
    ],
  },
];

export const HABIT: Habit = {
  id: "h1",
  name: "Утренняя пробежка",
  active: true,
  createdAt: null,
};

export const GRID_DATES = Array.from({ length: 84 }, (_, index) => {
  const date = new Date(Date.UTC(2026, 8, 16));
  date.setUTCDate(date.getUTCDate() - (83 - index));
  return date.toISOString().slice(0, 10);
});

export const DONE_DATES = new Set(GRID_DATES.filter((_, index) => index % 3 !== 0));

/* -------------------------------- analytics -------------------------------- */

/**
 * Samples for the analytics harness: a window with captures, timed work, a
 * dropped task, completions spread over several evenings, two goals (one of them
 * archived) and — deliberately — a task in the future and one from a month ago,
 * neither of which may appear in a window that ends today.
 */
function completion(day: string, hour: number, minute = 0): Timestamp {
  const [year, month, date] = day.split("-").map(Number);
  const at = new Date(year, month - 1, date, hour, minute);
  return { toDate: () => at } as unknown as Timestamp;
}

export const ANALYTICS_GOALS: Goal[] = [
  GOALS[0],
  {
    id: "g2",
    title: "Прочитать три книги по истории",
    description: "",
    deadline: "2026-12-31",
    status: "archived",
    subtasks: [],
    createdAt: null,
  },
];

export const ANALYTICS_HABITS: Habit[] = [
  HABIT,
  { id: "h2", name: "Читать перед сном", active: true, createdAt: null },
];

export const ANALYTICS_DONE_DATES = new Map<string, Set<string>>([
  ["h1", DONE_DATES],
  ["h2", new Set(GRID_DATES.filter((_, index) => index % 5 === 0))],
]);

export const ANALYTICS_TASKS: LifeTask[] = [
  task("a1", "Позвонить клиенту и обсудить условия продления контракта", TODAY, {
    startTime: "09:00",
    endTime: "10:30",
    status: "done",
    completedAt: completion(TODAY, 9, 30),
    goalId: "g1",
    priority: "high",
  }),
  task("a2", "Купить молоко", TODAY, { priority: "low" }),
  task("a3", "Дочитать главу про Первую мировую", TODAY, {
    startTime: "14:00",
    endTime: "15:00",
    status: "in_progress",
    goalId: "g2",
  }),
  task("a4", "Разобрать входящие", TODAY, {
    status: "done",
    completedAt: completion(TODAY, 22, 5),
  }),
  task("a5", "Write the launch email", YESTERDAY, {
    startTime: "11:00",
    endTime: "12:00",
    status: "done",
    completedAt: completion(YESTERDAY, 21, 10),
    goalId: "g1",
  }),
  task("a6", "Полить растения", YESTERDAY),
  task("a7", "Review the copy with the team", "2026-09-14"),
  task("a8", "Отменить подписку на рассылку", "2026-09-14", {
    dropped: true,
  }),
  task("a9", "Ship the docs", "2026-09-12", {
    startTime: "09:00",
    endTime: "10:00",
    status: "done",
    completedAt: completion("2026-09-12", 9, 15),
    goalId: "g1",
  }),
  task("a10", "Сходить в бассейн", "2026-09-11", {
    status: "done",
    completedAt: completion("2026-09-11", 21, 25),
  }),
  task("a11", "Собрать отчёт за неделю", "2026-09-10", {
    status: "done",
    completedAt: completion("2026-09-10", 21, 40),
  }),
  task("a12", "Позвонить в сервис", "2026-09-10"),
  // Outside the window at both ends: planning ahead and old history, neither of
  // which a window that ends today may count.
  task("a13", "Подготовить презентацию на октябрь", "2026-10-01", {
    priority: "high",
  }),
  task("a14", "Старая задача из августа", "2026-08-01", {
    status: "done",
    completedAt: completion("2026-08-01", 21, 55),
  }),
];

/**
 * Work assigned to days, none of it given a time — the capture-first case. It
 * is still a plan (that is the point), so the completion figure is real here.
 */
export const UNTIMED_ONLY_TASKS: LifeTask[] = [
  task("c1", "Идея для лендинга", TODAY),
  task("c2", "Почитать про шрифты", TODAY, {
    status: "done",
    completedAt: completion(TODAY, 10, 0),
  }),
  task("c3", "Написать Диме", YESTERDAY),
  task("c4", "Сравнить тарифы", "2026-09-14", {
    status: "done",
    completedAt: completion("2026-09-14", 11, 0),
  }),
  task("c5", "Записаться к врачу", "2026-09-13"),
];

/** Everything that was written down this window was taken off the plan. */
export const ALL_DROPPED_TASKS: LifeTask[] = [
  task("x1", "Идея для лендинга", TODAY, { dropped: true }),
  task("x2", "Сравнить тарифы", YESTERDAY, { dropped: true }),
  task("x3", "Позвонить в сервис", "2026-09-13", { dropped: true }),
];

/** Nothing dated inside the window at all, though the account has tasks. */
export const OUT_OF_WINDOW_TASKS: LifeTask[] = [
  task("o1", "Старая задача из августа", "2026-08-01", { status: "done" }),
  task("o2", "Подготовить презентацию на октябрь", "2026-10-01"),
];

/** Enough completions to chart, none of them twice in an hour. */
export const SPREAD_TASKS: LifeTask[] = [
  ...[8, 10, 13, 16, 19, 22].map((hour, index) =>
    task(`s${index}`, `Задача ${index + 1}`, TODAY, {
      status: "done",
      completedAt: completion(TODAY, hour, 5),
    }),
  ),
  task("s6", "Купить молоко", TODAY),
];

/** Below the sample threshold: three marks on the clock, two of them at 21:00. */
export const FEW_COMPLETIONS_TASKS: LifeTask[] = [
  task("f1", "Отчёт", TODAY, {
    status: "done",
    completedAt: completion(TODAY, 21, 5),
  }),
  task("f2", "Созвон", TODAY, {
    status: "done",
    completedAt: completion(TODAY, 21, 40),
  }),
  task("f3", "Почта", "2026-09-15", {
    status: "done",
    completedAt: completion("2026-09-15", 11, 0),
  }),
  task("f4", "Купить молоко", TODAY),
];
