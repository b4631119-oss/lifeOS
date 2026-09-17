"use client";

import { useElementWidth } from "@/hooks/useElementWidth";
import { hourLabel, type HourBucket } from "@/lib/analytics";
import { HOURS_LAYOUT, hourBars, niceMax, plotMetrics } from "@/lib/chart";
import { useLocale } from "next-intl";
import { useMemo } from "react";

interface CompletionHoursChartProps {
  buckets: HourBucket[];
  /**
   * Hour to emphasise, or `null` when no hour stands out.
   *
   * Decided by `hourInsight` and passed in rather than recomputed here: the
   * highlighted bar and the sentence above the chart are the same claim, and
   * two independent "tallest bar" rules are two chances to disagree.
   */
  highlightHour: number | null;
}

/** One bar per hour of the day: how many tasks were marked done in it. */
export default function CompletionHoursChart({
  buckets,
  highlightHour,
}: CompletionHoursChartProps) {
  const locale = useLocale();
  const [containerRef, width] = useElementWidth<HTMLDivElement>();

  const layout = HOURS_LAYOUT;
  const { plotWidth, plotHeight } = plotMetrics(width, layout);

  const yMax = useMemo(
    () => niceMax(Math.max(...buckets.map((b) => b.count), 0)),
    [buckets],
  );
  const bars = useMemo(
    () => hourBars(buckets, plotWidth, plotHeight, layout, yMax),
    [buckets, plotWidth, plotHeight, layout, yMax],
  );

  const yTicks = useMemo(() => {
    const step = yMax / 4;
    return Array.from({ length: 5 }, (_, i) => ({
      y: layout.top + plotHeight - ((i * step) / yMax) * plotHeight,
      label: String(i * step),
    }));
  }, [yMax, plotHeight, layout]);

  if (width === 0) return <div ref={containerRef} className="h-[280px]" />;

  const baseline = layout.top + plotHeight;

  return (
    <div ref={containerRef} className="max-w-full overflow-x-auto">
      {/*
       * Hidden from assistive technology: the sentence above the chart (or the
       * "not enough data" state) is its accessible equivalent, and leaving the
       * axis labels exposed would read out a jumble of numbers and hours.
       */}
      <svg
        width={width}
        height={layout.height}
        aria-hidden="true"
        className="font-sans text-[11px]"
      >
        {/* Y-axis gridlines */}
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={layout.left}
              y1={tick.y}
              x2={layout.left + plotWidth}
              y2={tick.y}
              stroke="rgba(148,163,184,0.2)"
              strokeDasharray="4 4"
            />
            <text
              x={layout.left - 6}
              y={tick.y + 4}
              textAnchor="end"
              fill="#667085"
            >
              {tick.label}
            </text>
          </g>
        ))}

        {/* Bars */}
        {bars.map((bar, i) => (
          <rect
            key={i}
            x={bar.x}
            y={baseline - bar.height}
            width={bar.width}
            height={bar.height}
            rx={4}
            fill={bar.hour === highlightHour ? "#12b76a" : "#9cb9ff"}
          />
        ))}

        {/* X-axis labels (every 3rd hour to avoid crowding) */}
        {bars
          .filter((_, i) => i % 3 === 0 || i === bars.length - 1)
          .map((bar, i) => (
            <text
              key={i}
              x={bar.x + bar.width / 2}
              y={baseline + 18}
              textAnchor="middle"
              fill="#667085"
              transform={`rotate(-45, ${bar.x + bar.width / 2}, ${baseline + 18})`}
            >
              {hourLabel(bar.hour, locale)}
            </text>
          ))}
      </svg>
    </div>
  );
}
