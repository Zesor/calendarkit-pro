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

/** Props of `components.EventContent`: what is drawn inside an event block, an all-day bar or a month chip. */
export interface EventContentProps {
  event: CalendarEvent;
  variant: 'block' | 'bar' | 'chip';
}

/** Props of `components.EventEditor` (the same as `renderEventForm`'s). */
export interface EventEditorProps {
  isOpen: boolean;
  onClose: () => void;
  event?: CalendarEvent | null;
  initialDate?: Date;
  /** True when the form is opened from the all-day row (preset to an all-day event). */
  initialAllDay?: boolean;
  onSave: (event: Partial<CalendarEvent>) => void;
  onDelete?: (eventId: string) => void;
}

/** Props of `components.Toolbar`. */
export interface ToolbarProps {
  date: Date;
  view: ViewType;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (view: ViewType) => void;
  /** Shows or hides the side panel. */
  onToggleSidebar: () => void;
}

/** Props of `components.Sidebar`. `onCreate` is undefined in read-only mode. */
export interface SidebarProps {
  date: Date;
  onDateChange: (date: Date) => void;
  onCreate?: () => void;
  calendars?: CalendarProps['calendars'];
  onCalendarToggle?: (calendarId: string, active: boolean) => void;
}

/** Props of `components.EmptyState` (the agenda without events). `onCreate` is undefined in read-only mode. */
export interface EmptyStateProps {
  onCreate?: () => void;
}

/** The host's own parts, used in place of the built-in ones. */
export interface CalendarComponents {
  EventContent?: React.ComponentType<EventContentProps>;
  EventEditor?: React.ComponentType<EventEditorProps>;
  Toolbar?: React.ComponentType<ToolbarProps>;
  Sidebar?: React.ComponentType<SidebarProps>;
  EmptyState?: React.ComponentType<EmptyStateProps>;
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
  /** First hour drawn by the week, day and resource views (0 to 23, default 0). */
  dayStartHour?: number;
  /** Hour the week, day and resource views end at (1 to 24, default 24). Events are cut at these hours. */
  dayEndHour?: number;
  /** Length of a time slot in minutes: 5, 10, 15 (default), 20, 30 or 60. Clicks, drops and resizes snap to it. */
  slotDuration?: number;
  eventTypes?: EventType[]; // Pre-defined types
  onCalendarToggle?: (calendarId: string, active: boolean) => void;
  isLoading?: boolean;
  /**
   * Adds the compiled stylesheet to the page (once, however many calendars). Pass `false` and
   * `import 'calendarkit-pro/styles.css'` instead for a strict Content-Security-Policy or a cached file.
   */
  injectStyles?: boolean;
  classNames?: CalendarClassNames;
  components?: CalendarComponents;
  isDarkMode?: boolean;
  onThemeToggle?: () => void;
  hideViewSwitcher?: boolean;
  language?: 'en' | 'fr';
  onLanguageChange?: (lang: 'en' | 'fr') => void;
  /** 1.x: the same as `components.EventEditor`, as a render function. */
  renderEventForm?: (props: EventEditorProps) => React.ReactNode;
}
