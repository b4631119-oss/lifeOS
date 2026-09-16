"use client";

import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import { MoreDotIcon } from "@/icons";
import { cn } from "@/utils";
import { useState } from "react";

export interface HabitAction {
  key: string;
  label: string;
  onSelect: () => void | Promise<void>;
  /** Renders the item in the destructive (error) style, after a divider. */
  destructive?: boolean;
}

interface HabitActionsMenuProps {
  /** Accessible label for the kebab trigger. */
  label: string;
  actions: HabitAction[];
}

/**
 * The single "..." trigger that keeps secondary habit actions out of the card's
 * main row. Destructive actions are pushed below a divider and colored red so
 * they never sit next to a normal action by accident.
 */
export default function HabitActionsMenu({
  label,
  actions,
}: HabitActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="dropdown-toggle flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-gray-200"
      >
        <MoreDotIcon className="h-5 w-5" />
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        className="min-w-40 p-1.5"
      >
        <ul className="flex flex-col">
          {actions.map((action, index) => (
            <li key={action.key}>
              {action.destructive && index > 0 && (
                <span className="my-1 block h-px bg-gray-100 dark:bg-white/10" />
              )}
              <DropdownItem
                baseClassName={cn(
                  "flex w-full items-center rounded-lg px-3 py-2 text-start text-theme-sm font-medium transition-colors",
                  action.destructive
                    ? "text-error-500 hover:bg-error-50 hover:text-error-600 dark:text-error-400 dark:hover:bg-error-500/10"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white",
                )}
                onClick={action.onSelect}
                onItemClick={() => setIsOpen(false)}
              >
                {action.label}
              </DropdownItem>
            </li>
          ))}
        </ul>
      </Dropdown>
    </div>
  );
}
