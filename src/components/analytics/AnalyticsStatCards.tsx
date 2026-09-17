"use client";

import type { WindowSummary } from "@/lib/analytics";
import { useTranslations } from "next-intl";

interface AnalyticsStatCardsProps {
  summary: WindowSummary;
}

/**
 * The five headline numbers: how much was written down, how much of it is work
 * the period commits to, how much of that was also put on the clock, how much is
 * done, and the share of the plan that got done.
 *
 * *Planned* and *With a time* are both here on purpose, because they are two
 * different questions — "what did I commit to" and "what did I put on the
 * clock" — and the old page conflated them by dividing by the timed tasks only.
 * A task added to a day without an hour is planned work, so it belongs in the
 * rate; the hour is detail inside the plan, not the plan itself.
 *
 * The completion card carries its denominator in words ("3 of 7") so the figure
 * can be checked against the two counts beside it. With nothing planned it says
 * "no data" rather than 0%: an empty denominator is not a failure, and the
 * captures are counted above regardless, so a window of unfiled thoughts still
 * shows its volume without being scored on it.
 */
export default function AnalyticsStatCards({
  summary,
}: AnalyticsStatCardsProps) {
  const t = useTranslations("analytics.stats");

  // The completion card also states what it divides — the same question the
  // Week review answers differently ("what was already due"), which is why each
  // screen has to name its own basis instead of sharing one word for it.
  const cards: {
    key: string;
    value: string;
    caption: string | null;
    hint: string | null;
  }[] = [
    {
      key: "captured",
      value: String(summary.captured),
      caption: null,
      hint: null,
    },
    {
      key: "planned",
      value: String(summary.planned),
      caption: null,
      hint: null,
    },
    { key: "timed", value: String(summary.timed), caption: null, hint: null },
    {
      key: "completed",
      value: String(summary.completed),
      caption: null,
      hint: null,
    },
    {
      key: "completion",
      value:
        summary.completionPercent === null
          ? t("noData")
          : `${summary.completionPercent}%`,
      caption:
        summary.completionPercent === null
          ? null
          : t("completionOf", {
              done: summary.completed,
              planned: summary.planned,
            }),
      hint:
        summary.completionPercent === null ? null : t("completionHint"),
    },
  ];

  // A definition list rather than a row of divs: these are named figures, so a
  // screen reader should hear each label as the name of its value ("Plan
  // completion: 43%") instead of loose numbers in a row.
  return (
    <dl className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.key}
          className={
            // On a phone the completion figure gets the full width of its own
            // row: it is the one number with a caption, and half a screen
            // squeezed it next to its denominator.
            card.key === "completion"
              ? "app-card col-span-2 p-4 sm:p-5 xl:col-span-1"
              : "app-card p-4 sm:p-5"
          }
        >
          <dt className="text-theme-xs text-gray-500 dark:text-gray-400">
            {t(card.key)}
          </dt>
          <dd className="mt-1.5 text-lg font-semibold text-gray-800 sm:text-theme-xl dark:text-white/90">
            {card.value}
          </dd>
          {card.caption && <dd className="app-label mt-1">{card.caption}</dd>}
          {card.hint && (
            <dd className="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
              {card.hint}
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}
