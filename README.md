# CalendarKit Pro

A professional, feature-rich React calendar component with drag-and-drop, recurring events, timezone support, resource scheduling, and internationalization.

[![npm version](https://badge.fury.io/js/calendarkit-pro.svg)](https://www.npmjs.com/package/calendarkit-pro)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **5 Views** - Month, Week, Day, Agenda, and Resource views
- **Drag & Drop** - Move events with smooth animations and grid snapping
- **Event Resize** - Drag event edges to adjust duration
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
| `onEventResize` | `(event, start, end) => void` | Event resize callback |
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
    byweekday?: number[];
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
Full month grid with event indicators. Click a date to switch to day view.

### Week View
7-day view with hourly time slots. Drag events to reschedule, resize from bottom edge.

### Day View
Single day with 15-minute time slots. Ideal for detailed scheduling.

### Agenda View
Chronological list of upcoming events for 30 days. Shows event details and metadata.

### Resource View
Horizontal timeline for scheduling across resources (rooms, people, equipment).

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
