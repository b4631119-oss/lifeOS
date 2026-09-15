"use client";

import { formatShortDay, parseDateKey } from "@/lib/date";
import { buildGridWeeks } from "@/lib/habits";
import { cn } from "@/utils";
import { useLocale } from "next-intl";

interface HabitActivityGridProps {
  /** `YYYY-MM-DD` keys, oldest first. */
  dates: string[];
  doneDates: ReadonlySet<string>;
  today: string;
}

export default function HabitActivityGrid({
  dates,
  doneDates,
  today,
}: HabitActivityGridProps) {
  const locale = useLocale();
  const weeks = buildGridWeeks(dates);

  return (
    <div className="inline-flex gap-1">
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="flex flex-col gap-1">
          {week.map((date, dayIndex) =>
            date ? (
              <span
                key={date}
                title={formatShortDay(parseDateKey(date), locale)}
                className={cn(
                  "h-3 w-3 rounded-[3px]",
                  doneDates.has(date)
                    ? "bg-brand-500"
                    : "bg-gray-200 dark:bg-gray-800",
                  date === today &&
                    "ring-1 ring-brand-400 ring-offset-1 ring-offset-white dark:ring-offset-gray-900",
                )}
              />
            ) : (
              <span
                key={`empty-${weekIndex}-${dayIndex}`}
                className="h-3 w-3"
              />
            ),
          )}
        </div>
      ))}
    </div>
  );
}
