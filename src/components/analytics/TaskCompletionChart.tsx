"use client";

import { useElementWidth } from "@/hooks/useElementWidth";
import type { DailyCompletion } from "@/lib/analytics";
import {
  COMPLETION_LAYOUT,
  Y_TICKS,
  axisPositions,
  joinRuns,
  labelIndexes,
  percentY,
  plotMetrics,
} from "@/lib/chart";

import { useMemo } from "react";

interface TaskCompletionChartProps {
  data: DailyCompletion[];
}

export default function TaskCompletionChart({ data }: TaskCompletionChartProps) {
  const [containerRef, width] = useElementWidth<HTMLDivElement>();

  const layout = COMPLETION_LAYOUT;
  const { plotWidth, plotHeight, baseline } = plotMetrics(width, layout);

  const points = useMemo(() => {
    const xs = axisPositions(data.length, plotWidth, layout.left);
    return data.map((point, i) => ({
      x: xs[i],
      y: point.percent != null ? percentY(point.percent, plotHeight, layout.top) : null,
      label: point.label,
    }));
  }, [data, plotWidth, plotHeight, layout]);

  const runs = useMemo(() => joinRuns(points, baseline), [points, baseline]);
  const yTicks = useMemo(() => {
    return Array.from({ length: Y_TICKS + 1 }, (_, i) => {
      const pct = (i / Y_TICKS) * 100;
      return { y: percentY(pct, plotHeight, layout.top), label: `${Math.round(pct)}%` };
    });
  }, [plotHeight, layout]);

  const xLabels = useMemo(() => {
    const xs = axisPositions(data.length, plotWidth, layout.left);
    return labelIndexes(data.length).map((i) => ({ x: xs[i], label: data[i]?.label ?? "" }));
  }, [data, plotWidth, layout]);

  if (width === 0) return <div ref={containerRef} className="h-[300px]" />;

  return (
    <div ref={containerRef} className="max-w-full overflow-x-auto">
      <svg width={width} height={layout.height} className="font-sans text-[11px]">
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
            <text x={layout.left - 6} y={tick.y + 4} textAnchor="end" fill="#667085">
              {tick.label}
            </text>
          </g>
        ))}

        {/* Area fill */}
        {runs.map((run, i) => (
          <path key={`a${i}`} d={run.area} fill="url(#areaGradient)" />
        ))}

        {/* Line */}
        {runs.map((run, i) => (
          <path key={`l${i}`} d={run.line} fill="none" stroke="#465fff" strokeWidth={2} />
        ))}

        {/* Dots */}
        {points
          .filter((p) => p.y !== null)
          .map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y!} r={3} fill="#465fff" stroke="#fff" strokeWidth={2} />
          ))}

        {/* X-axis labels */}
        {xLabels.map((l, i) => (
          <text key={i} x={l.x} y={baseline + 18} textAnchor="middle" fill="#667085">
            {l.label}
          </text>
        ))}

        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#465fff" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#465fff" stopOpacity={0.05} />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
