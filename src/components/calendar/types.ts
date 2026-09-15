import type { EventInput } from "@fullcalendar/react";

export type CalendarEventLevel = "Danger" | "Success" | "Primary" | "Warning";

export interface CalendarEvent extends EventInput {
  extendedProps: {
    calendar: string;
  };
}

export interface CalendarViewOption {
  key: string;
  /** Translation key under the `calendar.views` namespace. */
  labelKey: string;
}

export interface EventFormData {
  title: string;
  start: string;
  end: string;
  level: string;
}

export const CALENDAR_EVENT_LEVELS: Record<CalendarEventLevel, string> = {
  Danger: "danger",
  Success: "success",
  Primary: "primary",
  Warning: "warning",
};

export const CALENDAR_VIEW_OPTIONS: CalendarViewOption[] = [
  { key: "multiMonthYear", labelKey: "views.year" },
  { key: "dayGridMonth", labelKey: "views.month" },
  { key: "timeGridWeek", labelKey: "views.week" },
  { key: "timeGridDay", labelKey: "views.day" },
];
