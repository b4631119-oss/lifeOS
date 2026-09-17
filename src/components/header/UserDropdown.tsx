"use client";

import UserAvatar from "@/components/common/UserAvatar";
import { useAuth } from "@/context/AuthContext";
import { useClickOutside } from "@/hooks/useClickOutside";
import { getLanguage, languages } from "@/i18n/languages";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { ChevronDownIcon } from "@/icons";
import { signOutUser } from "@/lib/authActions";
import { resolveIdentity } from "@/lib/identity";
import { cn } from "@/utils";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";

export default function UserDropdown() {
  const t = useTranslations("userDropdown");
  const tCommon = useTranslations("common");
  const locale = useLocale() as Locale;
  const { user, profile } = useAuth();
  // Resolved from the signed-in Firebase user *and* the stored profile, so the
  // name chosen on the profile page is the name shown here — the fallbacks are
  // translated, and no identity is ever hard-coded (see `lib/identity.ts`).
  const identity = resolveIdentity(user, profile?.preferredName);
  const displayName = identity.name || tCommon("accountNameFallback");
  const email = identity.email || tCommon("emailMissing");
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubDropdownOpen, setIsSubDropdownOpen] = useState(false);
  const subDropdownRef = useRef<HTMLLIElement>(null);

  const currentLang = getLanguage(locale);
  const CurrentFlagIcon = currentLang.FlagIcon;

  useClickOutside(subDropdownRef, () => {
    setIsSubDropdownOpen(false);
  });

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (isOpen) {
      setIsSubDropdownOpen(false);
    }
  };

  const closeDropdown = () => {
    setIsOpen(false);
    setIsSubDropdownOpen(false);
  };

  const handleSelectLanguage = (id: Locale) => {
    router.replace(pathname, { locale: id });
    setIsSubDropdownOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="dropdown-toggle flex items-center rounded-lg text-gray-700 focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden dark:text-gray-400"
        aria-label={displayName}
        aria-expanded={isOpen}
      >
        <span className="flex sm:me-3">
          <UserAvatar photoURL={identity.photoURL} name={identity.name} />
        </span>

        {/* The name is the first thing to go when the bar gets narrow: the
            avatar still opens the same menu and the name is inside it. */}
        <span className="me-1 hidden max-w-40 truncate text-theme-sm font-medium sm:block">
          {displayName}
        </span>

        <ChevronDownIcon
          className={`size-5 text-gray-500 transition-transform duration-200 dark:text-gray-400 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute mt-4.25 flex w-65 flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg ltr:right-0 rtl:right-auto rtl:left-0 dark:border-gray-800 dark:bg-gray-dark"
      >
        <div className="min-w-0">
          <span className="block truncate text-theme-sm font-medium text-gray-700 dark:text-gray-400">
            {displayName}
          </span>
          <span className="mt-0.5 block truncate text-theme-xs text-gray-500 dark:text-gray-400">
            {email}
          </span>
        </div>

        <ul className="flex flex-col gap-1 border-b border-gray-200 pt-4 pb-3 dark:border-gray-800">
          <li className="relative" ref={subDropdownRef}>
            <button
              type="button"
              onClick={() => setIsSubDropdownOpen((prev) => !prev)}
              className={cn(
                "group flex max-h-10 w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-theme-sm font-medium transition-colors",
                isSubDropdownOpen
                  ? "bg-gray-100 text-gray-900 dark:bg-white/5 dark:text-white"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300",
              )}
            >
              <span className="flex items-center gap-3 text-theme-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M12.001 2.75C17.1091 2.75 21.2501 6.89178 21.2501 11.9999C21.2501 17.108 17.1091 21.2498 12.001 21.2498M12.001 2.75C6.89289 2.75 2.75195 6.89178 2.75195 11.9999C2.75195 17.108 6.8929 21.2498 12.001 21.2498M12.001 2.75C14.2097 2.75 16.0005 6.8914 16.0005 11.9993C16.0005 17.1073 14.2098 21.2498 12.001 21.2498M12.001 2.75C9.79226 2.75 8.00195 6.89141 8.00195 11.9994C8.00195 17.1073 9.79226 21.2498 12.001 21.2498M3.24561 8.99976H20.7544M3.24561 14.9998H20.7544"
                    stroke="#667085"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                <span>{t("language")}</span>
              </span>

              <span className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-theme-xs font-medium text-gray-700 dark:border-gray-800 dark:bg-white/3 dark:text-gray-300">
                <span>{currentLang.shortName}</span>
                <CurrentFlagIcon className="size-3.5 shrink-0 overflow-hidden rounded-full" />
              </span>
            </button>

            {isSubDropdownOpen && (
              <div className="absolute top-11 w-62.5 rounded-2xl border border-gray-200 bg-white p-2 shadow-theme-lg md:top-0 ltr:-left-2 ltr:md:right-[calc(100%+14px)] ltr:md:left-auto rtl:-right-2 rtl:md:right-auto rtl:md:left-[calc(100%+14px)] dark:border-gray-800 dark:bg-gray-dark">
                <ul className="flex flex-col gap-1">
                  {languages.map((language) => {
                    const isSelected = locale === language.id;
                    const FlagIcon = language.FlagIcon;

                    return (
                      <li key={language.id}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectLanguage(language.id);
                          }}
                          className={cn(
                            "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-start text-theme-sm font-medium transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white",
                            isSelected
                              ? "bg-brand-50 dark:bg-brand-500/15"
                              : "hover:bg-gray-100 dark:hover:bg-white/5",
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={cn(
                                "size-1.5 shrink-0 rounded-full transition-opacity",
                                isSelected
                                  ? "bg-brand-500 opacity-100 dark:bg-brand-400"
                                  : "opacity-0",
                              )}
                            />
                            <FlagIcon className="size-5 shrink-0 overflow-hidden rounded-full" />
                            <span className="truncate">{language.name}</span>
                          </span>

                          {language.badge && (
                            <span className="rounded bg-warning-50 px-1.5 py-0.5 text-theme-xs font-semibold text-warning-600 dark:bg-warning-500/15 dark:text-warning-400">
                              {language.badge}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </li>
        </ul>
        <button
          type="button"
          onClick={async () => {
            closeDropdown();
            await signOutUser();
            router.replace("/signin");
          }}
          className="group mt-3 flex w-full items-center justify-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-theme-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
        >
          {t("signOut")}
        </button>
      </Dropdown>
    </div>
  );
}
