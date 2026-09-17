"use client";

import {
  hourLabel,
  type HourBucket,
  type HourInsight,
} from "@/lib/analytics";
import { useLocale, useTranslations } from "next-intl";
import CompletionHoursChart from "./CompletionHoursChart";

interface HoursSectionProps {
  insight: HourInsight;
  buckets: HourBucket[];
}

/**
 * When tasks get marked done — spoken as a sentence, drawn only when it is
 * worth drawing.
 *
 * The number comes from `completedAt`, never from `startTime`, and the card's
 * description says so: planned time is when the user *meant* to work, and
 * mixing the two is how a "productive hour" chart ends up meaning nothing in
 * particular. Below the sample threshold there is no sentence and no chart —
 * just an honest "not enough data yet" with the count so far, because five
 * marks on the clock is the point where an hour can be named without dressing
 * up noise.
 */
export default function HoursSection({ insight, buckets }: HoursSectionProps) {
  const t = useTranslations("analytics.hours");
  const locale = useLocale();

  if (insight.kind === "insufficient") {
    return (
      <div className="py-8 text-center">
        <p className="text-theme-sm font-medium text-gray-700 dark:text-gray-300">
          {t("insufficientTitle")}
        </p>
        <p className="mx-auto mt-1.5 max-w-sm text-theme-xs text-gray-500 dark:text-gray-400">
          {t("insufficient", {
            samples: insight.samples,
            needed: insight.needed,
          })}
        </p>
        <p className="mx-auto mt-1.5 max-w-sm text-theme-xs text-gray-500 dark:text-gray-400">
          {t("insufficientHint")}
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-theme-sm text-gray-700 dark:text-gray-300">
        {insight.kind === "peak"
          ? t("peak", {
              hour: hourLabel(insight.hour, locale),
              count: insight.count,
              samples: insight.samples,
            })
          : t("spread", { samples: insight.samples })}
      </p>
      <CompletionHoursChart
        buckets={buckets}
        highlightHour={insight.kind === "peak" ? insight.hour : null}
      />
    </div>
  );
}
