"use client";

import DayNavigator from "@/components/common/DayNavigator";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useDay } from "@/context/DayContext";
import { formatDayHeading } from "@/lib/date";
import { useLocale, useTranslations } from "next-intl";

/**
 * The day's title and its date controls.
 *
 * The heading says which day is on screen. For today that is the module's own
 * name, but a day reached from the Week view ("открыть день") is not today, and
 * a page titled "Today" over another date claims something untrue — so there the
 * heading names the day it is actually showing, and the navigation below says
 * how far from now that is.
 *
 * It carries no "add task" button any more: adding a task happens in the
 * capture field below, and a second, larger button for the same action made the
 * screen ask the user to choose between two things that were not different.
 */
export default function TodayHeader() {
  const t = useTranslations("today");
  const locale = useLocale();
  const { date, isToday } = useDay();

  return (
    <div>
      <PageBreadcrumb
        pageTitle={isToday ? t("title") : formatDayHeading(date, locale)}
      />

      <div className="mb-4 sm:mb-6">
        {/* The greeting only makes sense for today; every other day shows its
            relative position ("yesterday") instead. */}
        <DayNavigator subtitle={isToday ? t("greeting") : undefined} />
      </div>
    </div>
  );
}
