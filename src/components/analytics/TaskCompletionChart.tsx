"use client";

import { useTheme } from "@/context/ThemeContext";
import type { DailyCompletion } from "@/lib/analytics";
import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

// Same lazy-loading pattern as the template's charts: ApexCharts touches the
// DOM on import, so it must not run during server rendering.
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface TaskCompletionChartProps {
  data: DailyCompletion[];
}

/** Percentage of each day's tasks that were completed, one point per day. */
export default function TaskCompletionChart({ data }: TaskCompletionChartProps) {
  const t = useTranslations("analytics.taskChart");
  const { theme } = useTheme();

  const options: ApexOptions = useMemo(
    () => ({
      chart: {
        // Matches `--font-outfit` in globals.css, so Cyrillic axis labels use
        // Inter rather than falling back to the browser default inside the SVG.
        fontFamily: "Outfit, Inter, sans-serif",
        type: "area",
        height: 300,
        toolbar: { show: false },
        background: "transparent",
        zoom: { enabled: false },
      },
      theme: { mode: theme },
      colors: ["#465fff"],
      dataLabels: { enabled: false },
      stroke: { curve: "smooth", width: 2 },
      fill: {
        type: "gradient",
        gradient: { opacityFrom: 0.45, opacityTo: 0.05 },
      },
      markers: { size: 3, strokeWidth: 2, hover: { size: 6 } },
      grid: { borderColor: "rgba(148, 163, 184, 0.2)", strokeDashArray: 4 },
      xaxis: {
        categories: data.map((point) => point.label),
        axisBorder: { show: false },
        axisTicks: { show: false },
        tooltip: { enabled: false },
        labels: { style: { fontSize: "11px" } },
      },
      yaxis: {
        min: 0,
        max: 100,
        tickAmount: 4,
        labels: { formatter: (value: number) => `${Math.round(value)}%` },
      },
      legend: { show: false },
      tooltip: { y: { formatter: (value: number) => `${value}%` } },
      noData: { text: t("empty") },
    }),
    [data, theme, t],
  );

  const series = useMemo(
    () => [{ name: t("series"), data: data.map((point) => point.percent) }],
    [data, t],
  );

  return (
    <div className="custom-scrollbar max-w-full overflow-x-auto">
      <ReactApexChart
        options={options}
        series={series}
        type="area"
        height={300}
      />
    </div>
  );
}
