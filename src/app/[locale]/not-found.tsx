"use client";

import GridShape from "@/components/common/GridShape";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

/**
 * The in-app 404, for a `notFound()` thrown inside the locale tree.
 *
 * It used to render two illustrations from `/images/error/404.svg`, which are
 * not in the repository — the page showed a broken-image icon on every visit.
 * The artwork is gone rather than re-drawn: the heading and the message already
 * say everything, and the only meaningful action is the way back home.
 *
 * URLs that match no route at all never reach this file — Next renders
 * `app/global-not-found.tsx` for those.
 */
export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <div className="relative z-1 flex min-h-screen flex-col items-center justify-center overflow-hidden p-6">
      <GridShape />
      <div className="mx-auto w-full max-w-60.5 text-center sm:max-w-118">
        <h1 className="mb-8 text-title-md font-bold text-gray-800 xl:text-title-2xl dark:text-white/90">
          {t("error")}
        </h1>

        <p className="mt-10 mb-6 text-base text-gray-700 sm:text-lg dark:text-gray-400">
          {t("message")}
        </p>

        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-3.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/3 dark:hover:text-gray-200"
        >
          {t("backHome")}
        </Link>
      </div>
      {/* <!-- Footer --> */}
      <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center text-sm text-gray-500 dark:text-gray-400">
        &copy; {new Date().getFullYear()} - LifeOS
      </p>
    </div>
  );
}
