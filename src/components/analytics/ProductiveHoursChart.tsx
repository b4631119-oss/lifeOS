"use client";

import { useTheme } from "@/context/ThemeContext";
import { hourLabel, type HourBucket } from "@/lib/analytics";
import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface ProductiveHoursChartProps {
  buckets: HourBucket[];
}

/** How many tasks were marked done in each hour of the day. */
export default function ProductiveHoursChart({
  buckets,
}: ProductiveHoursChartProps) {
  const t = useTranslations("analytics.hoursChart");
  const locale = useLocale();
  const { theme } = useTheme();

  const peakHour = useMemo(() => {
    let hour: number | null = null;
    let count = 0;

    for (const bucket of buckets) {
      if (bucket.count > count) {
        count = bucket.count;
        hour = bucket.hour;
      }
    }

    return hour;
  }, [buckets]);

  const options: ApexOptions = useMemo(
    () => ({
      chart: {
        fontFamily: "Outfit, Inter, sans-serif",
        type: "bar",
        height: 280,
        toolbar: { show: false },
        background: "transparent",
      },
      theme: { mode: theme },
      // Per-bar colors so the strongest hour stands out without a legend for a
      // single series.
      colors: buckets.map((bucket) =>
        bucket.hour === peakHour ? "#12b76a" : "#9cb9ff",
      ),
      plotOptions: {
        bar: {
          distributed: true,
          columnWidth: "55%",
          borderRadius: 4,
          borderRadiusApplication: "end",
        },
      },
      dataLabels: { enabled: false },
      grid: { borderColor: "rgba(148, 163, 184, 0.2)", strokeDashArray: 4 },
      xaxis: {
        categories: buckets.map((bucket) => hourLabel(bucket.hour, locale)),
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { rotate: -45, rotateAlways: true, style: { fontSize: "11px" } },
      },
      yaxis: { min: 0, forceNiceScale: true, labels: { formatter: (v) => `${Math.round(v)}` } },
      legend: { show: false },
      tooltip: { y: { formatter: (value: number) => `${value}` } },
      noData: { text: t("noDataMessage") },
    }),
    [buckets, locale, peakHour, theme, t],
  );

  const series = useMemo(
    () => [{ name: t("series"), data: buckets.map((bucket) => bucket.count) }],
    [buckets, t],
  );

  return (
    <div className="custom-scrollbar max-w-full overflow-x-auto">
      <ReactApexChart
        options={options}
        series={series}
        type="bar"
        height={280}
      />
    </div>
  );
}
