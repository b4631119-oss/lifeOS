"use client";

import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import { getLanguage, languages } from "@/i18n/languages";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { ChevronDownIcon } from "@/icons";
import { cn } from "@/utils";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

export default function LanguageSwitcher() {
  const t = useTranslations("userDropdown");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguage = getLanguage(locale);
  const CurrentFlagIcon = currentLanguage.FlagIcon;

  const handleSelect = (next: Locale) => {
    setIsOpen(false);
    if (next === locale) return;

    // Keeps the user on the current page while switching the locale prefix.
    router.replace(pathname, { locale: next });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={t("language")}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="dropdown-toggle flex h-11 items-center gap-2 rounded-full border border-gray-200 bg-white px-3 text-theme-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
      >
        <CurrentFlagIcon className="size-4 shrink-0 overflow-hidden rounded-full" />
        <span>{locale.toUpperCase()}</span>
        <ChevronDownIcon
          className={cn(
            "size-4 text-gray-400 transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      <Dropdown isOpen={isOpen} onClose={() => setIsOpen(false)} className="w-44 p-2">
        <ul className="flex flex-col gap-1">
          {languages.map((language) => {
            const FlagIcon = language.FlagIcon;
            const isSelected = language.id === locale;

            return (
              <li key={language.id}>
                <DropdownItem
                  baseClassName={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-theme-sm font-medium transition-colors",
                    isSelected
                      ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white",
                  )}
                  onClick={() => handleSelect(language.id)}
                >
                  <FlagIcon className="size-4 shrink-0 overflow-hidden rounded-full" />
                  <span>{language.name}</span>
                </DropdownItem>
              </li>
            );
          })}
        </ul>
      </Dropdown>
    </div>
  );
}
