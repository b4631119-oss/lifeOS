"use client";

import { RANGE_DAYS, type RangeDays } from "@/lib/analytics";
import { cn } from "@/utils";
import { useTranslations } from "next-intl";

interface RangeSwitchProps {
  value: RangeDays;
  onChange: (value: RangeDays) => void;
}

/** Segmented control for the chart window, styled like the template's tab switches. */
export default function RangeSwitch({ value, onChange }: RangeSwitchProps) {
  const t = useTranslations("analytics");

  return (
    <div
      role="group"
      aria-label={t("rangeLabel")}
      className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900"
    >
      {RANGE_DAYS.map((days) => (
        <button
          key={days}
          type="button"
          aria-pressed={value === days}
          onClick={() => onChange(days)}
          className={cn(
            "rounded-md px-3 py-1.5 text-theme-sm font-medium transition-colors",
            value === days
              ? "shadow-theme-xs bg-white text-gray-900 dark:bg-gray-800 dark:text-white"
              : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white",
          )}
        >
          {days === 7 ? t("rangeLast7") : t("rangeLast30")}
        </button>
      ))}
    </div>
  );
}
