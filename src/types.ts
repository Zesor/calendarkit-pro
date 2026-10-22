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
  /** Set to false to disable drag for this event. Default: true. */
  draggable?: boolean;
  /** Set to false to disable resize for this event. Defaults to the value of `draggable`. */
  resizable?: boolean;
  attachments?: EventAttachment[];
  guests?: string[]; // Array of email addresses
  reminders?: EventReminder[]; // Event reminders
  recurrence?: {
    freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    interval?: number;
    count?: number;
    until?: Date;
    byweekday?: number[]; // 0=MO, 6=SU
    /** Occurrence start dates excluded from the series. */
    exdates?: Date[];
  };
  /** Set on expanded occurrences: id of the recurring (master) event. */
  originalEventId?: string;
  /** Set on expanded occurrences: start of this occurrence. */
  occurrenceStart?: Date;
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
  /** Text and icons on `primary`. */
  primaryForeground?: string;
  secondary?: string;
  background?: string;
  foreground?: string;
  border?: string;
  muted?: string;
  /** Secondary text. */
  mutedForeground?: string;
  accent?: string;
  destructive?: string;
  /** Focus ring. */
  ring?: string;
}

/** Built-in looks, each in light and dark: `calm` (default, neutral), `vivid` (saturated), `editorial` (warm, serif titles). */
export type ThemePreset = 'calm' | 'vivid' | 'editorial';

/** `system` follows the operating system setting. */
export type ColorMode = 'light' | 'dark' | 'system';

export interface CalendarTheme {
  /** The built-in theme the overrides below apply to (default `calm`). */
  preset?: ThemePreset;
  /** Replaces colours of the preset (any CSS colour), in light and dark mode. */
  colors?: ThemeColors;
  fontFamily?: string;
  /** Base corner radius: the smaller and larger radii scale from it. */
  borderRadius?: string;
}

// Derived from the English language pack so the type always matches every
// key the components can actually read (the previous hand-written interface
// had drifted from the runtime keys).
export type CalendarTranslations = typeof en;

/** Extra classes for the calendar's parts, added next to the built-in ones. */
export interface CalendarClassNames {
  root?: string;
  toolbar?: string;
  sidebar?: string;
  /** Event blocks, all-day bars, month chips, agenda and resource items. */
  event?: string;
  /** Time slots, all-day slots and month days. */
  slot?: string;
  /** All-day and multi-day bars (they also get `event`). */
  allDayBar?: string;
  /** The quick card, the editor and the "+N" list. */
  dialog?: string;
}

export interface CalendarProps {
  /** Controlled (1.x): the host owns the list and updates it from the callbacks. */
  events?: CalendarEvent[];
  /** Uncontrolled: the starting list; the calendar keeps it and reports it through `onEventsChange`. Ignored with `events`. */
  defaultEvents?: CalendarEvent[];
  /** The whole list after every change (create, edit, move, resize, duplicate, delete, undo), in both modes. */
  onEventsChange?: (events: CalendarEvent[]) => void;
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
  /**
   * Called when a single occurrence of a recurring event is deleted. `updatedSeries` is the master
   * event with that occurrence added to `recurrence.exdates`: persist it to delete only this
   * occurrence. Without this prop, deleting an occurrence deletes the whole series (`onEventDelete`).
   */
  onOccurrenceDelete?: (occurrence: CalendarEvent, updatedSeries: CalendarEvent) => void;
  /** A preset name (`"calm"`, `"vivid"`, `"editorial"`) or a theme object. */
  theme?: CalendarTheme | ThemePreset;
  /** Light, dark or the system setting. Without `mode` nor `isDarkMode`, a `.dark` ancestor turns the calendar dark. */
  mode?: ColorMode;
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
  /**
   * Adds the compiled stylesheet to the page (once, however many calendars). Pass `false` and
   * `import 'calendarkit-pro/styles.css'` instead for a strict Content-Security-Policy or a cached file.
   */
  injectStyles?: boolean;
  classNames?: CalendarClassNames;
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
    /** True when the form is opened from the all-day row (preset to an all-day event). */
    initialAllDay?: boolean;
    onSave: (event: Partial<CalendarEvent>) => void;
    onDelete?: (eventId: string) => void;
  }) => React.ReactNode;
}
