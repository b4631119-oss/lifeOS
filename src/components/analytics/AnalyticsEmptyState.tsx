"use client";

import { ShootingStarIcon } from "@/icons";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

/** Shown when there is nothing to chart at all — not just an empty chart. */
export default function AnalyticsEmptyState() {
  const t = useTranslations("analytics.empty");

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-white/[0.03]">
      <ShootingStarIcon className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
      <h3 className="mt-4 text-theme-xl font-semibold text-gray-800 dark:text-white/90">
        {t("title")}
      </h3>
      <p className="mt-2 text-theme-sm text-gray-500 dark:text-gray-400">
        {t("message")}
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-brand-500 px-6 py-2.5 text-theme-sm font-medium text-white transition-colors hover:bg-brand-600"
      >
        {t("cta")}
      </Link>
    </div>
  );
}
