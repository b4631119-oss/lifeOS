"use client";

import dynamic from "next/dynamic";

const TodayView = dynamic(() => import("./TodayView"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500" />
    </div>
  ),
});

export default function TodayViewLoader() {
  return <TodayView />;
}
