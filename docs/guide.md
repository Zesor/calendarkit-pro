# Guide

How CalendarKit Pro works, part by part. Every prop is listed in the [API reference](api.md); upgrading from 1.x is covered in [MIGRATION.md](../MIGRATION.md).

- [Views](#views)
- [Time grid](#time-grid)
- [All-day and multi-day events](#all-day-and-multi-day-events)
- [Recurring events](#recurring-events)
- [Layouts](#layouts)
- [Creating, editing and undoing](#creating-editing-and-undoing)
- [Custom event form](#custom-event-form)
- [Places](#places)
- [Customizing](#customizing)
- [Theming](#theming)
- [Time zones](#time-zones)
- [Internationalization](#internationalization)
- [Resource scheduling](#resource-scheduling)
- [Multiple calendars](#multiple-calendars)
- [Phones and narrow calendars](#phones-and-narrow-calendars)
- [Accessibility](#accessibility)
- [Headless core and React bindings](#headless-core-and-react-bindings)

## Views

### Month View
Full month grid. All-day and multi-day events are continuous bars across their days; up to three timed events per day show as chips with their colour, then "+N more" opens the day. Click a date to switch to day view.

### Week View
7-day view with hourly time slots and an all-day row on top. Drag events to reschedule, resize from bottom edge. Each event shows as much as its size allows: the title alone for 15 minutes, "Title · 9:00" for 30 minutes, then the title over up to three lines and the times. Overlapping events sit side by side and stretch into free columns; past 2 or 3 columns (75 px each at least), the rest collapse into a "+N" button that lists them.

### Day View
Single day with time slots (15 minutes by default) and the all-day row, up to 4 overlapping events side by side. Ideal for detailed scheduling.

### Agenda View
Chronological list of upcoming events for 30 days. Shows event details and metadata.

### Resource View
Horizontal timeline for scheduling across resources (rooms, people, equipment).

## Time grid

The week, day and resource views share one time grid:

```tsx
<Scheduler
  dayStartHour={7}
  dayEndHour={20}
  slotDuration={30}
  workingHours={{ start: 9, end: 17.5 }} // Monday to Friday by default; `days: [1, 2, 3, 4]` (0 is Sunday)
  scrollToHour={8}
  reverseTimeAxis
/>
```

- `dayStartHour` / `dayEndHour` set the hours drawn. Events that run past them are cut at the edge; events entirely outside are not drawn in the grid (they stay in the agenda and the month view).
- `slotDuration` sets the slot length: a click, a drop, a resize and a drag selection snap to it.
- `reverseTimeAxis` puts the latest hours on top: the day runs upward, and an event's end is its top edge (the resize handle sits there). The resource view keeps its left-to-right timeline.
- `workingHours` shades the time outside working hours, and whole days that are not working days. Shaded time can still be clicked and dropped on.
- `scrollToHour` is the hour at the top of the grid when it opens (on a reversed grid too).
- Drag over free time with a mouse or a pen to create an event over that range: the quick card opens with it. On touch screens a drag scrolls, and a tap creates as before.

## All-day and multi-day events

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

## Recurring events

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

## Layouts

```tsx
<Scheduler layout="focus" />
```

- `classic` (default): header, side panel, a card beside each event you click.
- `focus`: the grid takes the whole calendar, under a floating toolbar (period, Today, previous / next, views, Create). A click on an event edits it in a panel docked beside the grid.
- `flow`: the week's days as a strip (dots show how busy each day is) and the chosen day as a feed of cards: events in order, free slots with **Book** (an hour at their start), the current time, and a floating **Create**. The full form opens as a sheet from the bottom.

A custom `components.Toolbar` replaces the Focus toolbar and Flow's top bar too; `renderEventForm` keeps your form in every layout. Focus and Flow have no side panel (so no `components.Sidebar` nor calendar toggles there: hide calendars with `calendars[].active`), and Flow shows the week strip and the day feed whatever `view` is (no loading skeleton, `EmptyState` nor `EventContent` there). In Focus, while the panel has changes, a click on the grid asks before anything else opens.

## Creating, editing and undoing

- A click on a free slot, or a drag over free time, opens a quick card beside the new event, which is drawn in its column. The title is a sentence the calendar understands, in English or French (`language`): "Lunch with Lea tomorrow 1pm for 2h" moves the event to tomorrow 13:00–15:00 and saves it as "Lunch with Lea". Enter saves. Under the title, one row each: the date and times (click them to change them), guests, location (with place search when `placeSearch` is set), description and calendar; an overlap is announced. "More options" opens the full form with everything the card already has. **Create** opens the same card at the next free hour today (events of a day or longer, drawn as bars, do not count).
- Every change (create, edit, move, resize, duplicate, delete) shows a toast with **Undo** for 6 seconds, so deleting asks no confirmation. The event just moved or edited is outlined briefly.
- The full form opens as a card beside the event (or the new event), without covering the calendar. It has one labelled row per part (When, Calendar, Location, Guests, Reminders, Description), keeps Save in view, and shows times in the calendar's `timezone`.
- Closing the card or the form with changes asks first ("Discard changes?").
- New events get no colour and no reminder you did not choose: they take their calendar's colour.
- With `renderEventForm`, a slot click opens your form as before.
- A click on an event opens a small card beside it (it never covers the event): its date and time, calendar, location (a link to a maps search), guests, reminders, attachments and description, with **Edit**, **Duplicate** and **Delete**. Edit opens the full form. With `renderEventForm`, a click opens your form as before.
- Right-click an event to edit, duplicate or delete it (disabled in `readOnly`).

## Custom event form

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

Your form replaces the built-in quick card and full form. It receives:

| Prop | Type | |
|------|------|---|
| `isOpen` | `boolean` | Whether the form should be shown |
| `onClose` | `() => void` | Call it to close the form |
| `event` | `CalendarEvent \| null` | The event being edited; `null` or absent for a new one |
| `initialDate` | `Date` | Start of the slot that was clicked, for a new event |
| `initialAllDay` | `boolean` | `true` when the form is opened from the all-day row |
| `onSave` | `(event: Partial<CalendarEvent>) => void` | Save the event (create or update) |
| `onDelete` | `(eventId: string) => void` | Delete the event |

- A click on a free slot, or **Create**, opens your form for a new event; a click on an event opens it with that event (`onEventClick` is still called first).
- It opens in every layout: Classic, Focus and Flow.
- When it closes, the focus goes back to what opened it.
- `components.EventEditor` is the same thing under another name; pass one or the other.

## Places

Place suggestions in the form's Location field are off by default: what is typed there goes to the provider. Turn them on with `placeSearch`, for example with the built-in OpenStreetMap adapter (Photon, no key):

```tsx
import { Scheduler, photonPlaces } from 'calendarkit-pro';

const placeSearch = photonPlaces({ lang: 'en' }); // once, outside the component

<Scheduler placeSearch={placeSearch} />
```

`lang` is one of `en`, `de`, `fr`, `it`. The public Photon server has a fair-use policy: for heavy traffic, run your own and pass its URL as `endpoint`.

A chosen place is saved as `event.place` (`{ name, address, lat, lon }`) with its text in `location`, and the event card links to Maps and to directions. A video link is kept as typed. Any provider fits: `placeSearch` is `(query, { signal }) => Promise<Place[]>`.

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

## Time zones

```tsx
<Scheduler
  timezone="Europe/Paris"
  onTimezoneChange={(tz) => console.log('Timezone:', tz)}
/>
```

`timezone` is an IANA time zone name, such as `'America/New_York'` or `'Asia/Tokyo'`. Without it, the calendar uses the browser's zone; an unknown name falls back to it with a console warning.

- Events are drawn at their time in that zone. Your data does not change: `start` and `end` stay the same instants, so an event at 9:00 in New York shows at 15:00 with `timezone="Europe/Paris"`.
- "Today", the current-time line, the hour the grid opens at and the grouping of the agenda follow `timezone` in the week, day, agenda and resource views.
- The built-in event form shows and saves times in `timezone`. A form of your own still receives instants (see [Custom event form](#custom-event-form)).
- All-day events are calendar dates: `timezone` never shifts them (see [All-day and multi-day events](#all-day-and-multi-day-events)).
- Recurring events keep their wall-clock time across daylight-saving changes, in that zone (see [Recurring events](#recurring-events)).
- The side panel shows the zone and its current time. Its picker offers a short list of common zones plus Local time (an empty string), and calls `onTimezoneChange` with the choice. The calendar does not keep it for you: keep it in your state so the choice sticks:

```tsx
const [timezone, setTimezone] = useState('Europe/Paris');

<Scheduler timezone={timezone} onTimezoneChange={setTimezone} />
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

Three props work together:

- `language` (`'en'` or `'fr'`) picks the built-in language pack: every interface text, the event form, the side panel and the accessible labels read by screen readers.
- `translations` overrides single keys of that pack. The `CalendarTranslations` type lists every key.
- `locale` is a date-fns locale. It formats dates, and sets the 12 or 24 hour clock and the week start.

The quick card understands typed sentences in the calendar's `language`: "Lunch with Lea tomorrow 1pm for 2h" in English, the same kind of sentence in French. Time zones are separate: see [Time zones](#time-zones).

Calendars are only listed in the sidebar when you pass `calendars`.

## Resource scheduling

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

The resource view is a horizontal timeline with one row per resource: rooms, people, equipment.

- A resource is `{ id, label, color?, avatar? }`. An event goes on a row through its `resourceId`.
- An event without its own `color` or calendar takes its resource's colour.
- A click on a free slot of a row opens the new-event card (or your own form) with that resource already assigned.
- Drag an event along its row to change its time, or to another row to change its resource. `onEventUpdate` receives the event with its new `resourceId`; `onEventDrop` receives the event before the move and its new dates.
- The view shares the time grid settings: `dayStartHour`, `dayEndHour` and `slotDuration` apply. `reverseTimeAxis` does not.
- Resources are rows, calendars are colours and filters: an event can have both a `resourceId` and a `calendarId` (see [Multiple calendars](#multiple-calendars)).

## Multiple calendars

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

## Phones and narrow calendars

Under 768 px of **calendar** width (a phone, or a calendar in a narrow column), the calendar switches to its phone layout by itself:

- The day view first (when you don't control `view`), a header on two rows with Today always there, and 44 px touch targets.
- The side panel becomes a drawer, opened by the menu button and closed after a pick.
- The event card, the quick card and the full form are bottom sheets, their actions always in view; Focus edits in a sheet instead of its side panel and picks its view from a menu.
- The month shows each day as one button with a dot per event; it opens the day.
- One floating Create button (Classic; Focus and Flow have their own).

## Accessibility

Everything works with Tab, Enter, Space and Escape; there are no other keyboard shortcuts to learn.

- Events, all-day bars, month chips, agenda items and Flow cards are buttons named in full: "Design review, Thursday 15 October, 10:00 AM to 11:45 AM, Work calendar, Room B", so the calendar never rests on colour alone.
- Time slots and all-day cells are buttons too ("Create an event on Thursday 15 October at 9:00 AM"), one tab stop per hour; in the month view, each day number opens that day.
- Dialogs take the focus, keep Tab inside them and give it back to what opened them on close (the Focus panel leaves Tab free, since the grid beside it stays usable). The event you create, duplicate or move takes the focus.
- Every move and resize can also be done in the event form (WCAG 2.5.7).

## Headless core and React bindings

The engine behind the `<Scheduler>` is published on its own as `calendarkit-pro/core`: no React, no DOM, usable on the server and from any framework. Use it to build a calendar UI of your own, or to drive the calendar's state from outside.

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
