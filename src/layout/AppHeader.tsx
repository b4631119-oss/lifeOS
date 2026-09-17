"use client";

import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import LanguageSwitcher from "@/components/header/LanguageSwitcher";
import UserDropdown from "@/components/header/UserDropdown";
import { useSidebar } from "@/context/SidebarContext";
import { Link } from "@/i18n/navigation";
import { DRAWER_TOGGLE_ID } from "@/lib/sidebar";
import { cn } from "@/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";

/**
 * The app header.
 *
 * One row at every width. On a phone the previous layout stacked two full-width
 * bars (brand row + a second row for the controls) with a border and a shadow
 * between them, which cost roughly a fifth of the screen before any content and
 * made the interface read as a desktop layout squeezed onto a phone.
 *
 * What is in the bar is decided by width, not by importance: on phones the brand
 * collapses to the icon (the page title already says where you are) and the
 * controls stay, because language, theme and the account menu are functions,
 * while the wordmark is decoration.
 */
const AppHeader: React.FC = () => {
  const t = useTranslations("header");
  const tCommon = useTranslations("common");

  const { isMobile, isMobileOpen, toggleSidebar, toggleMobileSidebar } =
    useSidebar();

  // Collapses the rail on desktop, opens the drawer on mobile — the same
  // breakpoint the drawer itself uses, instead of re-reading the window here.
  const handleToggle = isMobile ? toggleMobileSidebar : toggleSidebar;

  return (
    <header className="sticky top-0 z-30 w-full border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2 px-3 py-2.5 md:px-5 lg:py-3">
        <button
          type="button"
          // Named so the sidebar can hand focus back here when the drawer closes.
          id={DRAWER_TOGGLE_ID}
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden dark:text-gray-400 dark:hover:bg-white/5",
            isMobileOpen && "bg-gray-100 dark:bg-white/5",
          )}
          onClick={handleToggle}
          aria-label={t("toggleSidebar")}
          aria-expanded={isMobile ? isMobileOpen : undefined}
        >
          {isMobileOpen ? (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                fill="currentColor"
              />
            </svg>
          ) : (
            <svg
              className="rtl:-scale-x-100"
              width="16"
              height="12"
              viewBox="0 0 16 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M0.583252 1C0.583252 0.585788 0.919038 0.25 1.33325 0.25H14.6666C15.0808 0.25 15.4166 0.585786 15.4166 1C15.4166 1.41421 15.0808 1.75 14.6666 1.75L1.33325 1.75C0.919038 1.75 0.583252 1.41422 0.583252 1ZM0.583252 11C0.583252 10.5858 0.919038 10.25 1.33325 10.25L14.6666 10.25C15.0808 10.25 15.4166 10.5858 15.4166 11C15.4166 11.4142 15.0808 11.75 14.6666 11.75L1.33325 11.75C0.919038 11.75 0.583252 11.4142 0.583252 11ZM1.33325 5.25C0.919038 5.25 0.583252 5.58579 0.583252 6C0.583252 6.41421 0.919038 6.75 1.33325 6.75L7.99992 6.75C8.41413 6.75 8.74992 6.41421 8.74992 6C8.74992 5.58579 8.41413 5.25 7.99992 5.25L1.33325 5.25Z"
                fill="currentColor"
              />
            </svg>
          )}
        </button>

        {/* The brand: an icon on phones, the wordmark once there is room. */}
        <Link
          href="/today"
          className="flex shrink-0 items-center rounded-lg focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden"
        >
          <Image
            src="/images/logo/logo-icon.svg"
            alt={tCommon("logoAlt")}
            width={32}
            height={32}
            className="h-8 w-8 md:hidden"
            priority
          />
          <Image
            width={140}
            height={30}
            className="hidden h-7 w-auto md:block dark:hidden"
            src="/images/logo/logo.svg"
            alt={tCommon("logoAlt")}
            priority
          />
          <Image
            width={140}
            height={30}
            className="hidden h-7 w-auto md:dark:block"
            src="/images/logo/logo-dark.svg"
            alt={tCommon("logoAlt")}
            priority
          />
        </Link>

        <div className="ms-auto flex min-w-0 items-center gap-1 sm:gap-2">
          <LanguageSwitcher />
          <ThemeToggleButton />
          <UserDropdown />
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
