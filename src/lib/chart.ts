import type { HourBucket } from "@/lib/analytics";

/**
 * Geometry for the analytics chart.
 *
 * The chart is plain SVG (ApexCharts used to be ~940 KB of client JS for one
 * bar chart), so the layout maths lives here as pure functions: same approach
 * as `lib/habits.ts`, which keeps the streak rules out of the components so
 * they can be reasoned about and tested on their own.
 *
 * Only the completion-hours histogram is left. The task completion line chart
 * was removed with the pooled daily percentage it drew — see
 * `buildDailySummaries` — so the helpers that existed for it (an axis for 0–100
 * %, a line path builder, x-label thinning) went with it rather than staying
 * behind as dead code.
 */

export interface PlotLayout {
  /** Total SVG height. */
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Hour histogram: one bar per hour of the day. */
export const HOURS_LAYOUT: PlotLayout = {
  height: 280,
  top: 16,
  right: 12,
  bottom: 30,
  left: 36,
};

/** How many vertical gridlines the chart draws. */
export const Y_TICKS = 4;

export function plotMetrics(width: number, layout: PlotLayout) {
  // A floor keeps the maths sane on the very first paint, before the container
  // has been measured.
  const plotWidth = Math.max(width - layout.left - layout.right, 10);
  const plotHeight = layout.height - layout.top - layout.bottom;

  return { plotWidth, plotHeight, baseline: layout.top + plotHeight };
}

/** Peak count rounded up to a multiple of 4, so gridlines land on whole numbers. */
export function niceMax(value: number): number {
  return value <= 0 ? 4 : Math.ceil(value / Y_TICKS) * Y_TICKS;
}

export type HourBar = HourBucket & { x: number; width: number; height: number };

/** One bar per hour bucket, centred in its slot. */
export function hourBars(
  buckets: HourBucket[],
  plotWidth: number,
  plotHeight: number,
  layout: PlotLayout,
  yMax: number,
): HourBar[] {
  if (buckets.length === 0) return [];

  const slot = plotWidth / buckets.length;
  const width = Math.min(22, slot * 0.6);

  return buckets.map((bucket, index) => ({
    ...bucket,
    x: layout.left + slot * index + (slot - width) / 2,
    width,
    height: (bucket.count / yMax) * plotHeight,
  }));
}
