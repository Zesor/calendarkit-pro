import { Locale } from 'date-fns';

import { en } from './locales';

export type ViewType = 'month' | 'week' | 'day' | 'agenda' | 'resource';

export interface EventAttachment {
  id: string;
  name: string;
  url?: string;
  type: 'file' | 'link' | 'image';
  size?: string;
}

export interface EventReminder {
  id: string;
  type: 'notification' | 'email';
  time: number; // minutes before event
  label?: string; // e.g., "30 minutes before"
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  color?: string;
  allDay?: boolean;
  calendarId?: string;
  resourceId?: string;
  type?: string; // e.g. "meeting", "task", "holiday"
  icon?: string; // Lucide icon name or ReactNode if we can serialze
  attachments?: EventAttachment[];
  guests?: string[]; // Array of email addresses
  reminders?: EventReminder[]; // Event reminders
  recurrence?: {
    freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    interval?: number;
    count?: number;
    until?: Date;
    byweekday?: number[]; // 0=MO, 6=SU
  };
  // eslint-disable-next-line
  [key: string]: any;
}

export interface EventType {
  id: string;
  label: string;
  color?: string;
  icon?: React.ReactNode;
}

export interface Resource {
  id: string;
  label: string;
  color?: string;
  avatar?: string;
}

export interface ThemeColors {
  primary?: string;
  secondary?: string;
  background?: string;
  foreground?: string;
  border?: string;
  muted?: string;
  accent?: string;
}

export interface CalendarTheme {
  colors?: ThemeColors;
  fontFamily?: string;
  borderRadius?: string;
  // Future: lightColors, darkColors
}

// Derived from the English language pack so the type always matches every
// key the components can actually read (the previous hand-written interface
// had drifted from the runtime keys).
export type CalendarTranslations = typeof en;

export interface CalendarProps {
  events?: CalendarEvent[];
  translations?: Partial<CalendarTranslations>; // New prop
  view?: ViewType;
  onViewChange?: (view: ViewType) => void;
  date?: Date;
  onDateChange?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onEventDrop?: (event: CalendarEvent, start: Date, end: Date) => void;
  onEventResize?: (event: CalendarEvent, start: Date, end: Date) => void;
  onEventCreate?: (event: Partial<CalendarEvent>) => void;
  onEventUpdate?: (event: CalendarEvent) => void;
  onEventDelete?: (eventId: string) => void;
  theme?: CalendarTheme;
  locale?: Locale; // from date-fns
  timezone?: string; // e.g. "America/New_York"
  onTimezoneChange?: (timezone: string) => void;
  className?: string;
  readOnly?: boolean;
  calendars?: {
    id: string;
    label: string;
    color?: string;
    active?: boolean;
  }[];
  resources?: Resource[];
  eventTypes?: EventType[]; // Pre-defined types
  onCalendarToggle?: (calendarId: string, active: boolean) => void;
  isLoading?: boolean;
  isDarkMode?: boolean;
  onThemeToggle?: () => void;
  hideViewSwitcher?: boolean;
  language?: 'en' | 'fr';
  onLanguageChange?: (lang: 'en' | 'fr') => void;
  renderEventForm?: (props: {
    isOpen: boolean;
    onClose: () => void;
    event?: CalendarEvent | null;
    initialDate?: Date;
    onSave: (event: Partial<CalendarEvent>) => void;
    onDelete?: (eventId: string) => void;
  }) => React.ReactNode;
}
