"use client";

import { formatTime } from "@/lib/date";
import { useLocale } from "next-intl";
import { DAY_HEIGHT, HOURS, PX_PER_HOUR } from "./timeGrid";

/**
 * Left gutter with one label per hour.
 *
 * Labels reuse the app's locale-aware `formatTime`, so English renders "6 AM"
 * while Russian renders "06:00" — no hardcoded hour formats.
 */
export default function TimeAxis() {
  const locale = useLocale();

  return (
    <div
      className="relative w-14 shrink-0 select-none sm:w-16"
      style={{ height: DAY_HEIGHT }}
      aria-hidden="true"
    >
      {HOURS.map((hour) => (
        <span
          key={hour}
          className="absolute end-2 text-[11px] font-medium text-gray-400 tabular-nums sm:text-xs dark:text-gray-500"
          style={{ top: hour * PX_PER_HOUR + 2 }}
        >
          {formatTime(`${String(hour).padStart(2, "0")}:00`, locale)}
        </span>
      ))}
    </div>
  );
}
