"use client";

import DayNavigator from "@/components/common/DayNavigator";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import { useDay } from "@/context/DayContext";
import { PlusIcon } from "@/icons";
import { useTranslations } from "next-intl";

interface TodayHeaderProps {
  onAddTask: () => void;
}

export default function TodayHeader({ onAddTask }: TodayHeaderProps) {
  const t = useTranslations("today");
  const { isToday } = useDay();

  return (
    <div>
      <PageBreadcrumb pageTitle={t("title")} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        {/* The greeting only makes sense for today; every other day shows its
            relative position ("yesterday") instead. */}
        <DayNavigator subtitle={isToday ? t("greeting") : undefined} />

        <Button size="sm" startIcon={<PlusIcon />} onClick={onAddTask}>
          {t("addTask")}
        </Button>
      </div>
    </div>
  );
}
