"use client";

import { useTranslations } from "next-intl";
import { minutesToOffset } from "./timeGrid";

interface NowIndicatorProps {
  /** Minutes since local midnight. */
  minutes: number;
}

/**
 * The horizontal "now" line. The caller only renders it once the clock has
 * hydrated, so its position never mismatches between server and client.
 */
export default function NowIndicator({ minutes }: NowIndicatorProps) {
  const t = useTranslations("schedule");

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-20 flex -translate-y-1/2 items-center"
      style={{ top: minutesToOffset(minutes) }}
      role="presentation"
    >
      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-error-500" />
      <span className="h-px flex-1 bg-error-500" />
      <span className="ms-1 rounded-full bg-error-500 px-1.5 py-px text-[10px] font-medium text-white">
        {t("now")}
      </span>
    </div>
  );
}
