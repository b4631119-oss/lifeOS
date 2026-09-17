"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  children: ReactNode;
  showCloseButton?: boolean;
  isFullscreen?: boolean;
  /**
   * Id of the element naming the dialog — normally its `<h3>` title.
   *
   * A dialog without an accessible name is announced as just "dialog", so the
   * caller passes the id of the heading it already renders (see `useId` at the
   * call sites).
   */
  labelledBy?: string;
}

/**
 * Shared dialog wrapper used by every module.  Handles:
 *  - `role="dialog"` / `aria-modal` / `aria-labelledby` for assistive technology
 *  - Focus trap (Tab / Shift+Tab) while open
 *  - Restores focus to the previously focused element on close
 *  - Blocks background scroll via `body.overflow: hidden`
 *  - Escape to close
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  className,
  showCloseButton = true,
  isFullscreen = false,
  labelledBy,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const t = useTranslations("common");

  // Focus trap + Escape
  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    // Move focus into the panel after the browser finishes layout.
    const raf = requestAnimationFrame(() => {
      modalRef.current?.focus();
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key !== "Tab" || !modalRef.current) return;

      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      cancelAnimationFrame(raf);
    };
  }, [isOpen, onClose]);

  // Restore focus to the trigger element that was active before the dialog
  useEffect(() => {
    if (isOpen) return;
    previousFocusRef.current?.focus();
  }, [isOpen]);

  // Block background scroll while the dialog is open.  Store the previous
  // value so we can restore it (instead of unconditionally resetting to
  // "unset" which would break scroll locks held by other components).
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous || "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const contentClasses = isFullscreen
    ? "w-full h-full"
    : // Dialogs keep the page's card language (2xl radius) and are bounded by
      // the viewport so a long form scrolls inside itself on a phone instead of
      // running off the screen.
      "relative w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900";

  return (
    <div
      className="fixed inset-0 z-99999 flex items-start justify-center overflow-y-auto px-4 py-4 sm:px-6 sm:py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      {!isFullscreen && (
        <div
          className="fixed inset-0 h-full w-full bg-gray-900/40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      <div
        ref={modalRef}
        className={`${contentClasses} ${className ?? ""}`}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute inset-e-3 top-3 z-999 flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
            aria-label={t("close")}
          >
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
                d="M6.04289 16.5413C5.65237 16.9318 5.65237 17.565 6.04289 17.9555C6.43342 18.346 7.06658 18.346 7.45711 17.9555L11.9987 13.4139L16.5408 17.956C16.9313 18.3466 17.5645 18.3466 17.955 17.956C18.3455 17.5655 18.3455 16.9323 17.955 16.5418L13.4129 11.9997L17.955 7.4576C18.3455 7.06707 18.3455 6.43391 17.955 6.04338C17.5645 5.65286 16.9313 5.65286 16.5408 6.04338L11.9987 10.5855L7.45711 6.0439C7.06658 5.65338 6.43342 5.65338 6.04289 6.0439C5.65237 6.43442 5.65237 7.06759 6.04289 7.45811L10.5845 11.9997L6.04289 16.5413Z"
                fill="currentColor"
              />
            </svg>
          </button>
        )}
        <div>{children}</div>
      </div>
    </div>
  );
};
