"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

interface BreadcrumbProps {
  pageTitle: string;
}

const PageBreadcrumb: React.FC<BreadcrumbProps> = ({ pageTitle }) => {
  const t = useTranslations("common");

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-6">
      <h2 className="app-page-title">{pageTitle}</h2>
      {/* The trail repeats the title that is already next to it, so it only
          earns its place once there is width for it. */}
      <nav className="hidden sm:block">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400"
              // The dashboard's home, not the public landing page: this
              // breadcrumb only ever renders inside the authenticated shell.
              href="/today"
            >
              {t("home")}
              <svg
                className="stroke-current rtl:rotate-180"
                width="17"
                height="16"
                viewBox="0 0 17 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6.0765 12.667L10.2432 8.50033L6.0765 4.33366"
                  stroke=""
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </li>
          <li className="text-sm text-gray-800 dark:text-white/90">
            {pageTitle}
          </li>
        </ol>
      </nav>
    </div>
  );
};

export default PageBreadcrumb;
