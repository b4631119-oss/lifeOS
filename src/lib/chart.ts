import type { HourBucket } from "@/lib/analytics";

/**
 * Geometry for the analytics charts.
 *
 * The charts themselves are plain SVG (ApexCharts used to be ~940 KB of client
 * JS for one line and one bar chart), so the layout maths lives here as pure
 * functions: same approach as `lib/habits.ts`, which keeps the streak rules out
 * of the components so they can be reasoned about and tested on their own.
 */

export interface PlotLayout {
  /** Total SVG height. */
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Completion-rate chart: 0–100% on the vertical axis. */
export const COMPLETION_LAYOUT: PlotLayout = {
  height: 300,
  top: 16,
  right: 18,
  bottom: 30,
  left: 42,
};

/** Hour histogram: one bar per hour of the day. */
export const HOURS_LAYOUT: PlotLayout = {
  height: 280,
  top: 16,
  right: 12,
  bottom: 30,
  left: 36,
};

/** How many vertical gridlines both charts draw. */
export const Y_TICKS = 4;

export function plotMetrics(width: number, layout: PlotLayout) {
  // A floor keeps the maths sane on the very first paint, before the container
  // has been measured.
  const plotWidth = Math.max(width - layout.left - layout.right, 10);
  const plotHeight = layout.height - layout.top - layout.bottom;

  return { plotWidth, plotHeight, baseline: layout.top + plotHeight };
}

/** Evenly spaced x positions for `count` points, first at `left`. */
export function axisPositions(
  count: number,
  plotWidth: number,
  left: number,
): number[] {
  if (count <= 0) return [];
  if (count === 1) return [left];

  const step = plotWidth / (count - 1);
  return Array.from({ length: count }, (_, index) => left + step * index);
}

/** y for a 0–100 percentage: 100% sits on the top edge of the plot. */
export function percentY(
  percent: number,
  plotHeight: number,
  top: number,
): number {
  return top + (1 - percent / 100) * plotHeight;
}

export type SeriesPoint = { x: number; y: number | null };

/**
 * Line and area paths, joining only neighbours that *both* carry a value.
 *
 * A day with nothing planned is a gap in the data, not a 0% day, so the line
 * must not be drawn across it. The area path fills each joined pair down to the
 * baseline, which is what gives the series its gradient without one polygon
 * spanning the gaps.
 */
export function joinRuns(points: SeriesPoint[], baseline: number) {
  const runs: { line: string; area: string }[] = [];

  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    if (from.y === null || to.y === null) continue;

    runs.push({
      line: `M ${from.x} ${from.y} L ${to.x} ${to.y}`,
      area: `M ${from.x} ${baseline} L ${from.x} ${from.y} L ${to.x} ${to.y} L ${to.x} ${baseline} Z`,
    });
  }

  return runs;
}

/**
 * Indexes worth labelling: roughly `max` of them, with the first and last always
 * kept so the axis still shows where the window starts and ends.
 */
export function labelIndexes(count: number, max = 8): number[] {
  if (count <= 0) return [];

  const step = Math.max(1, Math.ceil(count / max));
  const indexes = new Set<number>();
  for (let index = 0; index < count; index += step) indexes.add(index);
  indexes.add(count - 1);

  return [...indexes].sort((a, b) => a - b);
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

/**
 * Hour with the most completions, or `null` when nothing was completed.
 *
 * Compares buckets themselves rather than indexes into `buckets`: the hour is
 * not guaranteed to equal its position in the array (a histogram can be sliced
 * or sparse), and indexing by hour crashed on those inputs.
 */
export function peakHour(buckets: HourBucket[]): number | null {
  const best = buckets.reduce<HourBucket | null>(
    (current, bucket) =>
      bucket.count > 0 && (current === null || bucket.count > current.count)
        ? bucket
        : current,
    null,
  );

  return best?.hour ?? null;
}
