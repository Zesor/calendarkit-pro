# CalendarKit Pro

A professional, feature-rich React calendar component with drag-and-drop, recurring events, timezone support, resource scheduling, and internationalization.

[![npm version](https://badge.fury.io/js/calendarkit-pro.svg)](https://www.npmjs.com/package/calendarkit-pro)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **5 Views** - Month, Week, Day, Agenda, and Resource views
- **Drag & Drop** - Move events with smooth animations and grid snapping
- **Event Resize** - Drag event edges to adjust duration
- **All-day & Multi-day Events** - Continuous bars, collapsible all-day row, move by days and stretch
- **Recurring Events** - Daily, weekly, monthly, yearly with RRule support
- **Timezone Support** - Full IANA timezone handling
- **i18n Ready** - Built-in English/French, fully customizable
- **Resource Scheduling** - Schedule across rooms, people, or equipment
- **Dark Mode** - Built-in theme toggle
- **Mobile Friendly** - Touch gestures and responsive layout
- **TypeScript** - Full type definitions included
- **High Performance** - Handles 10,000+ events

## Installation

```bash
npm install calendarkit-pro
```

## Requirements

CalendarKit Pro requires **TailwindCSS**. Add the package to your Tailwind config:

```js
// tailwind.config.js
module.exports = {
  content: [
    // ... your paths
    './node_modules/calendarkit-pro/**/*.{js,mjs}',
  ],
}
```

## Quick Start

```tsx
import { Scheduler } from 'calendarkit-pro';
import type { CalendarEvent, ViewType } from 'calendarkit-pro';
import { useState } from 'react';

function MyCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [view, setView] = useState<ViewType>('week');
  const [date, setDate] = useState(new Date());

  return (
    <Scheduler
      events={events}
      view={view}
      onViewChange={setView}
      date={date}
      onDateChange={setDate}
      onEventCreate={(event) => {
        setEvents([...events, { ...event, id: crypto.randomUUID() } as CalendarEvent]);
      }}
      onEventUpdate={(event) => {
        setEvents(events.map(e => e.id === event.id ? event : e));
      }}
      onEventDelete={(id) => {
        setEvents(events.filter(e => e.id !== id));
      }}
    />
  );
}
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `events` | `CalendarEvent[]` | Array of events to display |
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
| `timezone` | `string` | IANA timezone (e.g., `'America/New_York'`) |
| `onTimezoneChange` | `(tz: string) => void` | Timezone change callback |
| `language` | `'en'` \| `'fr'` | UI language |
| `translations` | `Partial<CalendarTranslations>` | Custom translations |
| `locale` | `Locale` | date-fns locale for formatting |
| `isDarkMode` | `boolean` | Enable dark mode |
| `onThemeToggle` | `() => void` | Dark mode toggle callback |
| `theme` | `CalendarTheme` | Custom theme colors |
| `readOnly` | `boolean` | Disable editing |
| `isLoading` | `boolean` | Show loading skeletons |
| `hideViewSwitcher` | `boolean` | Hide view switcher |
| `renderEventForm` | `(props) => ReactNode` | Custom event form |

## Types

### CalendarEvent

```typescript
interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  color?: string;
  allDay?: boolean;
  calendarId?: string;
  resourceId?: string;
  type?: string;
  guests?: string[];
  attachments?: EventAttachment[];
  reminders?: EventReminder[];
  recurrence?: {
    freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    interval?: number;
    count?: number;
    until?: Date;
    byweekday?: number[]; // 0 = Monday … 6 = Sunday
    exdates?: Date[];     // occurrence starts excluded from the series
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
  colors?: {
    primary?: string;
    secondary?: string;
    background?: string;
    foreground?: string;
    border?: string;
    muted?: string;
    accent?: string;
  };
  fontFamily?: string;
  borderRadius?: string;
}
```

## Views

### Month View
Full month grid. All-day and multi-day events are continuous bars across their days. Click a date to switch to day view.

### Week View
7-day view with hourly time slots and an all-day row on top. Drag events to reschedule, resize from bottom edge.

### Day View
Single day with 15-minute time slots and the all-day row. Ideal for detailed scheduling.

### Agenda View
Chronological list of upcoming events for 30 days. Shows event details and metadata.

### Resource View
Horizontal timeline for scheduling across resources (rooms, people, equipment).

## All-day and Multi-day Events

```tsx
const events = [
  // All-day: the end is exclusive, this offsite covers 12–14 October
  { id: 'offsite', title: 'Offsite', start: new Date(2026, 9, 12), end: new Date(2026, 9, 15), allDay: true },
  // Timed events of 24 hours or more are shown with the all-day events
  { id: 'flight', title: 'Flight', start: new Date(2026, 9, 14, 22), end: new Date(2026, 9, 16, 4) },
];
```

- All-day events are calendar dates: `timezone` never shifts them. The end is exclusive (midnight after the last day); an end at 23:59 on the same day, or equal to the start, means one day. Date-only values such as `new Date('2026-10-12')` keep their date in every timezone.
- The week and day views show them in a collapsible row above the grid (2 lanes, then "+N more"). The month view draws continuous bars (up to 3 lanes per week); its "+N more" counts the hidden bars and events of the day.
- Drag a bar to move it by whole days, or stretch its right edge to change its last day. `onEventDrop` / `onEventResize` then `onEventUpdate` fire as for timed events; `draggable: false`, `resizable: false` and `readOnly` apply.
- Click an empty day of the all-day row to create an all-day event. The event form has an All Day switch and shows the last day included.

## Recurring Events

```tsx
const recurringEvent: CalendarEvent = {
  id: '1',
  title: 'Weekly Standup',
  start: new Date(),
  end: new Date(Date.now() + 3600000),
  recurrence: {
    freq: 'WEEKLY',
    interval: 1,
    count: 10, // or use 'until' for end date
  },
};
```

Occurrences keep their wall-clock time across daylight-saving changes, in the `timezone` prop's zone (or the browser's).

Moving, resizing or editing one occurrence updates the whole series by the same amount (`onEventUpdate` receives the recurring event). To delete a single occurrence, handle `onOccurrenceDelete`:

```tsx
<Scheduler
  events={events}
  onOccurrenceDelete={(occurrence, updatedSeries) => {
    setEvents(events.map(e => (e.id === updatedSeries.id ? updatedSeries : e)));
  }}
/>
```

### Invalid data

Dates may be `Date` objects, ISO strings or timestamps. Events with an invalid date or an end before their start are skipped, with a warning in development. Event ids must be unique (duplicates are rendered but warned about, and break drag & drop).

Treat events as immutable: to change an event, pass a new object (`events.map(e => e.id === id ? { ...e, title } : e)`). Computations are cached per event object, so mutating an event in place may not be reflected.

## Timezone Support

```tsx
<Scheduler
  timezone="Europe/Paris"
  onTimezoneChange={(tz) => console.log('Timezone:', tz)}
/>
```

## Internationalization

```tsx
import { fr } from 'date-fns/locale';

const frenchTranslations = {
  today: "Aujourd'hui",
  month: 'Mois',
  week: 'Semaine',
  day: 'Jour',
  agenda: 'Agenda',
  createEvent: 'Créer un événement',
  // ... more translations
};

<Scheduler
  language="fr"
  locale={fr}
  translations={frenchTranslations}
/>
```

All interface texts (views, event form, sidebar, accessible labels) come from the language pack selected by `language`; `translations` overrides individual keys. Calendars are only listed in the sidebar when you pass `calendars`.

Right-click an event to edit, duplicate or delete it (disabled in `readOnly`).

## Theming

```tsx
<Scheduler
  isDarkMode={darkMode}
  onThemeToggle={() => setDarkMode(!darkMode)}
  theme={{
    colors: {
      primary: '#3b82f6',
      background: '#ffffff',
      foreground: '#1a1a1a',
    },
    fontFamily: 'Inter, sans-serif',
    borderRadius: '12px',
  }}
/>
```

## Resource Scheduling

```tsx
const resources: Resource[] = [
  { id: 'room-a', label: 'Conference Room A', color: '#3b82f6' },
  { id: 'room-b', label: 'Conference Room B', color: '#10b981' },
];

<Scheduler
  view="resource"
  resources={resources}
  events={events}
/>
```

## Multiple Calendars

```tsx
const calendars = [
  { id: 'work', label: 'Work', color: '#3b82f6', active: true },
  { id: 'personal', label: 'Personal', color: '#10b981', active: true },
];

<Scheduler
  calendars={calendars}
  onCalendarToggle={(id, active) => {
    // Toggle calendar visibility
  }}
/>
```

## Custom Event Form

```tsx
<Scheduler
  renderEventForm={({ isOpen, onClose, event, onSave, onDelete }) => (
    <MyCustomForm
      open={isOpen}
      onClose={onClose}
      event={event}
      onSave={onSave}
      onDelete={onDelete}
    />
  )}
/>
```

`initialAllDay` is `true` when the form is opened from the all-day row.

## Headless core (2.0 preview)

The 2.0 engine ships ahead of the new UI as `calendarkit-pro/core`: no React, no DOM, usable on the server and from any framework. Install the preview with `npm install calendarkit-pro@next`; the API may still change until 2.0.0.

```ts
import { createCalendar, selectTimeGrid } from 'calendarkit-pro/core'

const calendar = createCalendar({ defaultEvents: events, onEventsChange: save })
calendar.subscribe(() => draw(selectTimeGrid(calendar.getState(), { maxColumns: 3 })))

calendar.openSlot(new Date(2026, 9, 15, 14))
calendar.updateDraft({ title: 'Lunch with Lea tomorrow 1pm for 2h' }) // moves the draft
calendar.saveDraft() // creates "Lunch with Lea", then calls onEventsChange
calendar.undo()
```

- `createCalendar` keeps the view, the date, the events (controlled with `events`, or uncontrolled with `defaultEvents`), dialogs and drafts. Moving, resizing, deleting and duplicating call the 1.x callbacks, then `onEventsChange` with the full list; `undo()` reverts the last change.
- `selectTimeGrid`, `selectMonth`, `selectAgenda`, `selectFlowDay` and `selectResources` turn a state into plain data ready to render (overlaps laid out, extra events grouped into "+N").
- `parseEventSentence` reads dates, times, durations and repetition in a title, in English and French.

## Exports

```typescript
// Components
export { Scheduler } from 'calendarkit-pro';

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
} from 'calendarkit-pro';

// Utilities
export { cn } from 'calendarkit-pro';
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT License - see [LICENSE](LICENSE) for details.

## Links

- [GitHub](https://github.com/Zesor/calendarkit-pro)
- [Issues](https://github.com/Zesor/calendarkit-pro/issues)
- [CalendarKit](https://calendarkit.io)
