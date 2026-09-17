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
            // 44px tall like every other control: the segmented switch is the
            // page's main control on a phone, and it was a thumb-sized pill
            // short of the target. The focus ring is the shared one, so the
            // keyboard can see where it is.
            "inline-flex min-h-11 items-center justify-center rounded-md px-4 text-theme-sm font-medium transition-colors focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden",
            value === days
              ? "bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white"
              : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white",
          )}
        >
          {days === 7 ? t("rangeLast7") : t("rangeLast30")}
        </button>
      ))}
    </div>
  );
}
