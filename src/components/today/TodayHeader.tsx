"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import { PlusIcon } from "@/icons";
import { formatDayLabel } from "@/lib/date";
import { useLocale, useTranslations } from "next-intl";

interface TodayHeaderProps {
  onAddTask: () => void;
}

export default function TodayHeader({ onAddTask }: TodayHeaderProps) {
  const t = useTranslations("today");
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
            {t("greeting")}
          </p>
        </div>

        <Button size="sm" startIcon={<PlusIcon />} onClick={onAddTask}>
          {t("addTask")}
        </Button>
      </div>
    </div>
  );
}
