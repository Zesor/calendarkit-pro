# API reference

Everything the `<Scheduler>` accepts and the types it exports. For how the pieces work together, see the [guide](guide.md).

## Props

| Prop | Type | Description |
|------|------|-------------|
| `events` | `CalendarEvent[]` | Events to display (controlled: you update the list from the callbacks) |
| `defaultEvents` | `CalendarEvent[]` | Starting events, uncontrolled: the calendar keeps the list (ignored with `events`) |
| `onEventsChange` | `(events: CalendarEvent[]) => void` | The whole list after every change (create, edit, move, resize, duplicate, delete, undo) |
| `view` | `ViewType` | Current view: `'month'` \| `'week'` \| `'day'` \| `'agenda'` \| `'resource'` |
| `date` | `Date` | Currently focused date |
| `onViewChange` | `(view: ViewType) => void` | View change callback |
| `onDateChange` | `(date: Date) => void` | Date change callback |
| `onEventCreate` | `(event: Partial<CalendarEvent>) => void` | Event creation callback |
| `onEventUpdate` | `(event: CalendarEvent) => void` | Event update callback |
| `onEventDelete` | `(eventId: string) => void` | Event deletion callback |
| `onEventDrop` | `(event, start, end) => void` | Called when an event is dropped (with the event before the move and its new dates), alongside `onEventUpdate` |
| `onEventResize` | `(event, start, end) => void` | Called when an event is resized, alongside `onEventUpdate` (both fire, so update your state in only one of them) |
| `onOccurrenceDelete` | `(occurrence, updatedSeries) => void` | Delete a single occurrence of a recurring event: persist `updatedSeries` (it has the date in `recurrence.exdates`). Without it, deleting an occurrence deletes the series |
| `calendars` | `Calendar[]` | Multiple calendar support |
| `resources` | `Resource[]` | Resources for resource view |
| `eventTypes` | `EventType[]` | Pre-defined event types |
| `dayStartHour` | `number` | First hour of the week, day and resource grids (0 to 23, default 0, see [Time grid](guide.md#time-grid)) |
| `dayEndHour` | `number` | Hour those grids end at (1 to 24, default 24) |
| `slotDuration` | `number` | Slot length in minutes: 5, 10, 15 (default), 20, 30 or 60 |
| `reverseTimeAxis` | `boolean` | Week and day views: the latest hours on top |
| `workingHours` | `WorkingHours` | Week and day views: shade the time outside `{ start, end, days? }` |
| `scrollToHour` | `number` | Week and day views: the hour at the top when the grid opens (default: a few hours before now) |
| `timezone` | `string` | IANA timezone (e.g., `'America/New_York'`) |
| `onTimezoneChange` | `(tz: string) => void` | Timezone change callback |
| `language` | `'en'` \| `'fr'` | UI language |
| `translations` | `Partial<CalendarTranslations>` | Custom translations |
| `locale` | `Locale` | date-fns locale for formatting |
| `theme` | `'calm'` \| `'vivid'` \| `'editorial'` \| `CalendarTheme` | Built-in theme or theme object (default `'calm'`, see [Theming](guide.md#theming)) |
| `mode` | `'light'` \| `'dark'` \| `'system'` | Color mode. Without `mode` nor `isDarkMode`, a `.dark` ancestor turns the calendar dark |
| `isDarkMode` | `boolean` | Dark mode (alias of `mode="dark"` / `mode="light"`) |
| `onThemeToggle` | `() => void` | Dark mode toggle callback |
| `injectStyles` | `boolean` | Adds the stylesheet to the page (default `true`) |
| `readOnly` | `boolean` | Disable editing |
| `isLoading` | `boolean` | Show loading skeletons |
| `hideViewSwitcher` | `boolean` | Hide view switcher |
| `renderEventForm` | `(props) => ReactNode` | Custom event form (same as `components.EventEditor`) |
| `classNames` | `CalendarClassNames` | Extra classes for `root`, `toolbar`, `sidebar`, `event`, `slot`, `allDayBar`, `dialog` (see [Customizing](guide.md#customizing)) |
| `layout` | `'classic'` \| `'focus'` \| `'flow'` | How the calendar is laid out (default `'classic'`, see [Layouts](guide.md#layouts)) |
| `placeSearch` | `(query, { signal }) => Promise<Place[]>` | Place suggestions in the form's Location field, off by default (see [Places](guide.md#places)) |
| `components` | `CalendarComponents` | Your own `EventContent`, `EventEditor`, `Toolbar`, `Sidebar`, `EmptyState` (see [Customizing](guide.md#customizing)) |

## Types

### CalendarEvent

```typescript
interface CalendarEvent {
  id: string;                 // unique
  title: string;
  start: Date;                // Date, ISO string or timestamp
  end: Date;                  // all-day events: exclusive (midnight after the last day)
  allDay?: boolean;
  description?: string;
  color?: string;             // else the calendar's, else the resource's, else the theme's
  calendarId?: string;
  resourceId?: string;
  type?: string;              // one of `eventTypes`
  location?: string;          // free text, shown in the event card with a maps link
  place?: Place;              // chosen with `placeSearch`: { name, address?, lat, lon }
  guests?: string[];          // email addresses
  reminders?: EventReminder[];
  attachments?: EventAttachment[];
  draggable?: boolean;        // false: cannot be moved (default true)
  resizable?: boolean;        // false: cannot be stretched (defaults to `draggable`)
  recurrence?: {
    freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    interval?: number;
    count?: number;
    until?: Date;
    byweekday?: number[];     // 0 = Monday … 6 = Sunday
    exdates?: Date[];         // occurrence starts excluded from the series
  };
}
```

### Resource

```typescript
interface Resource {
  id: string;
  label: string;
  color?: string;
  avatar?: string;
}
```

### CalendarTheme

```typescript
interface CalendarTheme {
  preset?: 'calm' | 'vivid' | 'editorial'; // default 'calm'
  colors?: {
    primary?: string;
    primaryForeground?: string;
    secondary?: string;
    background?: string;
    foreground?: string;
    border?: string;
    muted?: string;
    mutedForeground?: string;
    accent?: string;
    destructive?: string;
    ring?: string;
  };
  fontFamily?: string;
  borderRadius?: string; // base radius, the others scale from it
}
```

## Exports

```typescript
// Components and helpers
export { Scheduler, photonPlaces } from 'calendarkit-pro';

// Types
export type {
  CalendarEvent,
  CalendarProps,
  CalendarTheme,
  CalendarTranslations,
  ViewType,
  EventType,
  Resource,
  EventReminder,
  EventAttachment,
  ThemeColors,
  ThemePreset,
  ColorMode,
} from 'calendarkit-pro';

// Stylesheet, for `injectStyles={false}`
import 'calendarkit-pro/styles.css';
```
