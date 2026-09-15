"use client";

import Badge from "@/components/ui/badge/Badge";
import { FlameIcon } from "@/icons";
import { useTranslations } from "next-intl";

interface StreakBadgeProps {
  current: number;
  best: number;
}

export default function StreakBadge({ current, best }: StreakBadgeProps) {
  const t = useTranslations("habits");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge
        size="sm"
        color="warning"
        startIcon={<FlameIcon className="h-3.5 w-3.5" />}
      >
        {t("currentStreak")}: {t("days", { count: current })}
      </Badge>
      <Badge size="sm" color="light">
        {t("bestStreak")}: {t("days", { count: best })}
      </Badge>
    </div>
  );
}
