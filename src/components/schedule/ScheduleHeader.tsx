"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import { PlusIcon } from "@/icons";
import { formatDayLabel } from "@/lib/date";
import { useLocale, useTranslations } from "next-intl";

interface ScheduleHeaderProps {
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
  const locale = useLocale();

  return (
    <div>
      <PageBreadcrumb pageTitle={t("title")} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p
            className="text-theme-sm font-medium text-gray-800 dark:text-white/90"
            suppressHydrationWarning
          >
            {formatDayLabel(new Date(), locale)}
          </p>
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">
            {loading ? t("loading") : t("taskCount", { count: taskCount })}
          </p>
        </div>

        <Button size="sm" startIcon={<PlusIcon />} onClick={onAddTask}>
          {t("addTask")}
        </Button>
      </div>
    </div>
  );
}
