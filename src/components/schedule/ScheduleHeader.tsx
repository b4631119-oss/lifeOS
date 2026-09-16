"use client";

import DayNavigator from "@/components/common/DayNavigator";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import { PlusIcon } from "@/icons";
import { useTranslations } from "next-intl";

interface ScheduleHeaderProps {
  /** Tasks with a time — what the timeline actually holds. */
  taskCount: number;
  loading: boolean;
  onAddTask: () => void;
}

export default function ScheduleHeader({
  taskCount,
  loading,
  onAddTask,
}: ScheduleHeaderProps) {
  const t = useTranslations("schedule");

  return (
    <div>
      <PageBreadcrumb pageTitle={t("title")} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <DayNavigator
          subtitle={
            loading ? t("loading") : t("taskCount", { count: taskCount })
          }
        />

        <Button size="sm" startIcon={<PlusIcon />} onClick={onAddTask}>
          {t("addTask")}
        </Button>
      </div>
    </div>
  );
}
