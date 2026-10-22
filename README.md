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
- **Themes** - Calm, Vivid and Editorial, each in light and dark, with WCAG AA text contrast on theme colours
- **Zero setup** - Ships its own compiled CSS: no Tailwind, no stylesheet to import
- **Mobile Friendly** - Touch gestures and responsive layout
- **TypeScript** - Full type definitions included
- **High Performance** - Handles 10,000+ events

## Installation

```bash
npm install calendarkit-pro
```

## Requirements

React 18 or 19, nothing else: the calendar brings its own stylesheet and adds it to the page once. The Tailwind `content` entry that 1.x needed can be removed (see [Styles and Content-Security-Policy](#styles-and-content-security-policy) to load the CSS as a file instead).

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

Or let the calendar keep the list itself (uncontrolled), and save it when it changes:

```tsx
<Scheduler defaultEvents={initialEvents} onEventsChange={(events) => save(events)} />
```

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
| `timezone` | `string` | IANA timezone (e.g., `'America/New_York'`) |
| `onTimezoneChange` | `(tz: string) => void` | Timezone change callback |
| `language` | `'en'` \| `'fr'` | UI language |
| `translations` | `Partial<CalendarTranslations>` | Custom translations |
| `locale` | `Locale` | date-fns locale for formatting |
| `theme` | `'calm'` \| `'vivid'` \| `'editorial'` \| `CalendarTheme` | Built-in theme or theme object (default `'calm'`, see [Theming](#theming)) |
| `mode` | `'light'` \| `'dark'` \| `'system'` | Color mode. Without `mode` nor `isDarkMode`, a `.dark` ancestor turns the calendar dark |
| `isDarkMode` | `boolean` | Dark mode (alias of `mode="dark"` / `mode="light"`) |
| `onThemeToggle` | `() => void` | Dark mode toggle callback |
| `injectStyles` | `boolean` | Adds the stylesheet to the page (default `true`) |
| `readOnly` | `boolean` | Disable editing |
| `isLoading` | `boolean` | Show loading skeletons |
| `hideViewSwitcher` | `boolean` | Hide view switcher |
| `renderEventForm` | `(props) => ReactNode` | Custom event form (same as `components.EventEditor`) |
| `classNames` | `CalendarClassNames` | Extra classes for `root`, `toolbar`, `sidebar`, `event`, `slot`, `allDayBar`, `dialog` (see [Customizing](#customizing)) |
| `components` | `CalendarComponents` | Your own `EventContent`, `EventEditor`, `Toolbar`, `Sidebar`, `EmptyState` (see [Customizing](#customizing)) |

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

## Views

### Month View
Full month grid. All-day and multi-day events are continuous bars across their days; up to three timed events per day show as chips with their colour, then "+N more" opens the day. Click a date to switch to day view.

### Week View
7-day view with hourly time slots and an all-day row on top. Drag events to reschedule, resize from bottom edge. Each event shows as much as its size allows: the title alone for 15 minutes, "Title · 9:00" for 30 minutes, then the title over up to three lines and the times. Overlapping events sit side by side and stretch into free columns; past 2 or 3 columns (75 px each at least), the rest collapse into a "+N" button that lists them.

### Day View
Single day with 15-minute time slots and the all-day row, up to 4 overlapping events side by side. Ideal for detailed scheduling.

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

## Creating and undoing

- A click on a free slot opens a quick card over the grid, with the new event drawn dashed in its column. The title is a sentence the calendar understands, in English or French (`language`): "Lunch with Lea tomorrow 1pm for 2h" moves the event to tomorrow 13:00–15:00 and saves it as "Lunch with Lea". Enter saves; duration chips, the calendar menu and an overlap warning sit under the title; "More options" opens the full form with what the card already has.
- Every change (create, edit, move, resize, duplicate, delete) shows a toast with **Undo** for 6 seconds, so deleting asks no confirmation. The event just moved or edited is outlined briefly.
- Closing the card or the form with changes asks first ("Discard changes?").
- New events get no colour and no reminder you did not choose: they take their calendar's colour.
- With `renderEventForm`, a slot click opens your form as before.
- A click on an event opens a small card next to it: its date and time, calendar, location (a link to a maps search), guests, attachments and description, with **Edit**, **Duplicate** and **Delete**. Edit opens the full form. With `renderEventForm`, a click opens your form as before.

## Customizing

`classNames` adds your classes next to the built-in ones:

```tsx
<Scheduler classNames={{ root: 'my-calendar', event: 'shadow-none', dialog: 'my-dialog' }} />
```

Keys: `root`, `toolbar`, `sidebar`, `event` (blocks, all-day bars, month chips, agenda and resource items), `slot` (time slots, all-day slots, month days), `allDayBar`, `dialog` (quick card, event card, form, "+N" list).

`components` replaces parts with your own:

```tsx
import type { EventContentProps, ToolbarProps } from 'calendarkit-pro';

const EventContent = ({ event }: EventContentProps) => <strong>{event.title}</strong>;
const Toolbar = ({ date, onPrev, onNext, onToday }: ToolbarProps) => (
  <header>
    <button onClick={onPrev}>Previous</button>
    <button onClick={onToday}>{date.toDateString()}</button>
    <button onClick={onNext}>Next</button>
  </header>
);

<Scheduler components={{ EventContent, Toolbar }} />
```

| Component | Props | Replaces |
|-----------|-------|----------|
| `EventContent` | `{ event, variant: 'block' \| 'bar' \| 'chip' }` | The inside of event blocks, all-day bars and month chips |
| `EventEditor` | the `renderEventForm` props | The event form (`renderEventForm` still works) |
| `Toolbar` | `{ date, view, onPrev, onNext, onToday, onViewChange, onToggleSidebar }` | The header |
| `Sidebar` | `{ date, onDateChange, onCreate?, calendars?, onCalendarToggle? }` | The side panel |
| `EmptyState` | `{ onCreate? }` | The empty agenda |

`onCreate` is undefined in read-only mode.

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

Three built-in themes, each in light and dark: `calm` (default, neutral), `vivid` (saturated, the closest to 1.x) and `editorial` (warm tones, serif titles).

```tsx
<Scheduler theme="vivid" mode="system" />

// Adjust a preset (a 1.x theme object keeps working: it applies on top of `calm`)
<Scheduler
  theme={{ preset: 'editorial', colors: { primary: '#0b7285' }, borderRadius: '8px' }}
  mode={darkMode ? 'dark' : 'light'}
  onThemeToggle={() => setDarkMode(!darkMode)}
/>
```

- `mode` is `'light'`, `'dark'` or `'system'` (follows the operating system). `isDarkMode` still works as an alias. Without either, the calendar turns dark inside a `.dark` element, as in 1.x.
- Every colour is a CSS variable on `.ck-root`, so plain CSS can override any of them: `--ck-background`, `--ck-foreground`, `--ck-muted`, `--ck-muted-foreground`, `--ck-accent`, `--ck-border`, `--ck-primary`, `--ck-primary-foreground`, `--ck-ring`, `--ck-destructive`, `--ck-destructive-foreground`, `--ck-warning`, `--ck-event` (events without a colour) with `--ck-event-ink-light` and `--ck-event-ink-dark`, and `--ck-radius`, `--ck-font`, `--ck-font-display`.
- Events are drawn per theme: a tint with coloured text (calm), the solid colour with white text (vivid), a card with a coloured top edge (editorial). Today's date is a rounded square, a circle or an underline.

```css
.ck-root { --ck-primary: #0b7285; --ck-ring: #0b7285; }
.ck-root[data-ck-mode="dark"] { --ck-primary: #66d9e8; }
```

- The themes name their fonts (Instrument Sans, Plus Jakarta Sans, Newsreader) but do not download them, so the calendar never calls a font service: load them yourself (Google Fonts, Fontsource) or the system font takes over.

### Styles and Content-Security-Policy

The `<Scheduler>` adds its stylesheet to the page once, as an inline `<style>` (hoisted into `<head>` on React 19). With a Content-Security-Policy that forbids inline styles, to cache the CSS as a file, or to avoid unstyled content before hydration on React 18 server rendering, turn the injection off and import the same stylesheet:

```tsx
import 'calendarkit-pro/styles.css'

<Scheduler injectStyles={false} />
```

Every class is prefixed with `ck:` and the reset only applies inside `.ck-root`: the calendar never restyles your page, and works the same with Tailwind 3, Tailwind 4 or no Tailwind at all.

Size or space the calendar with `className` (`className="h-[600px] rounded-xl"`): the stylesheet comes first in `<head>`, so your classes win ties. Its classes are not in a cascade layer, so on a Tailwind 4 page (utilities in `@layer utilities`) use the important modifier (`h-[600px]!`) or size a wrapper element instead.

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

An event takes its own `color`, else the colour of its calendar (`calendarId`), else its resource's in the resource view, else the theme's. Hex and `rgb()` colours are adjusted so that every text reaches 4.5:1 contrast: white on the solid colour, a dark ink on the light tint, a light ink on the dark one. Other colour syntaxes are used as they are.

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

### React bindings

`calendarkit-pro/react` connects the engine to React (the `<Scheduler>` itself now runs on it):

```tsx
import { useCalendar, useCalendarSelector, getEventProps, CalendarDndContext } from 'calendarkit-pro/react'
import { selectTimeGrid } from 'calendarkit-pro/core'

function MyWeek({ events, onEventsChange }) {
  const calendar = useCalendar({ events, onEventsChange })
  const grid = useCalendarSelector(calendar, (s) => selectTimeGrid(s, { maxColumns: 3 }))
  return (
    <CalendarDndContext calendar={calendar}>
      {grid.columns.map((column) => column.blocks.map((b) => <button key={b.event.id} {...getEventProps(calendar, b.event)}>{b.event.title}</button>))}
    </CalendarDndContext>
  )
}
```

- `useCalendar(options)` creates the store once and keeps it in sync with your props; `useCalendarSelector` re-renders only when the selected slice changes. `CalendarProvider` / `useCalendarContext` share the store without passing it down.
- `getEventProps`, `getSlotProps` and `getResizeHandleProps` return the props of an accessible event button, an empty slot and a resize handle.
- `CalendarDndContext`, `useDraggableEvent`, `useDroppableSlot` and `useActiveDrag` wire dnd-kit to the store (drops call `calendar.move`, dragging is off in `readOnly`).

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
  ThemePreset,
  ColorMode,
} from 'calendarkit-pro';

// Stylesheet, for `injectStyles={false}`
import 'calendarkit-pro/styles.css';
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
