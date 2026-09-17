"use client";

/**
 * TEMPORARY QA screen (see `../../page.tsx`).
 *
 * Every state a Today row can be in, rendered side by side with the markers
 * passed in explicitly — the clock decides "now"/"next" in the real list, so
 * this is the only way to look at those two states on purpose.
 */
import TaskItem from "@/components/today/TaskItem";
import { useLocale, useTranslations } from "next-intl";
import Shell from "../../Shell";
import { GOALS, TASKS, TODAY, task } from "../../fixtures";

export default function UiQaTodayStatesPage() {
  const t = useTranslations("today");
  const locale = useLocale();
  const goalsById = Object.fromEntries(GOALS.map((goal) => [goal.id, goal]));

  const rows = [
    task("s1", "Сейчас идёт: созвон с командой", TODAY, {
      startTime: "09:00",
      endTime: "10:30",
      status: "in_progress",
      priority: "high",
    }),
    task("s2", "Дальше по плану: подготовить отчёт", TODAY, {
      startTime: "11:00",
      endTime: "12:00",
      goalId: "g1",
    }),
    task("s3", "Без времени и без приоритета", TODAY),
    task("s4", "Выполнено, с целью", TODAY, { status: "done", goalId: "g1" }),
    task("s5", "Убрана из плана", TODAY, {
      dropped: true,
      startTime: "13:00",
      endTime: "14:00",
    }),
    task(
      "s6",
      "Высокий приоритет: очень длинное название задачи, которое должно переноситься на телефоне",
      TODAY,
      {
        priority: "high",
      },
    ),
    task("s7", "Низкий приоритет", TODAY, { priority: "low" }),
  ];

  return (
    <Shell>
      <h1 className="mb-4 text-title-sm font-semibold text-gray-800 dark:text-white/90">
        {t("title")} — row states ({locale})
      </h1>

      <ul className="space-y-2 sm:space-y-3">
        {rows.map((item, index) => (
          <TaskItem
            key={item.id}
            task={item}
            goalsById={goalsById}
            goalsResolved
            marker={index === 0 ? "current" : index === 1 ? "next" : undefined}
            highlighted={index === 2}
            onToggle={() => undefined}
            onEdit={() => undefined}
            onDelete={() => undefined}
          />
        ))}
      </ul>

      <p className="mt-6 text-theme-xs text-gray-500 dark:text-gray-400">
        {TASKS.length} fixture tasks · {t("taskAdded")}
      </p>
    </Shell>
  );
}
