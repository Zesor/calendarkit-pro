# Pro-Scheduler Changelog

## 2.0.0-alpha.2

Pre-release on the `next` dist-tag (`latest` stays on 1.4.x). Breaking changes are listed in [MIGRATION.md](MIGRATION.md).

### Added
- The `<Scheduler>` brings its own stylesheet (Tailwind v4 compiled by the library, every class prefixed with `ck:`, a reset scoped to `.ck-root`) and adds it to the page once: no Tailwind setup, no CSS import. `calendarkit-pro/styles.css` and `injectStyles={false}` cover strict Content-Security-Policies.
- Themes: `theme="calm" | "vivid" | "editorial"` or `{ preset, colors, fontFamily, borderRadius }`, each in light and dark with text contrast of at least 4.5:1, and `mode="light" | "dark" | "system"`. Every colour is a `--ck-*` CSS variable.

### Changed
- Breaking: the default theme is `calm` (neutral) instead of the 1.x blue; `theme="vivid"` is the closest to 1.x.
- Breaking: `cn` is no longer exported, and the host's `--primary`, `--background`… variables no longer theme the calendar.
- Animations are CSS and respect `prefers-reduced-motion`.

### Removed
- Runtime dependencies `framer-motion`, `lucide-react`, `clsx`, `class-variance-authority`, `tailwind-merge`, `date-fns-tz` (time zones now use `Intl`) and `@dnd-kit/modifiers`. What remains: `date-fns`, `rrule`, `@dnd-kit/core`, `@dnd-kit/utilities`.

### Fixed
- Events without a colour use the theme's primary colour in the agenda, the resource view and the drag preview (1.x drew them transparent).

## 2.0.0-alpha.1

Pre-release on the `next` dist-tag (`latest` stays on 1.4.x).

### Added
- `calendarkit-pro/react`: `useCalendar`, `useCalendarSelector`, `useCalendarState`, `CalendarProvider` / `useCalendarContext`, the prop-getters `getEventProps`, `getSlotProps`, `getResizeHandleProps`, and the dnd-kit bridge `CalendarDndContext`, `useDraggableEvent`, `useDroppableSlot`, `useActiveDrag`.
- `calendar.saveEvent(data)` in `calendarkit-pro/core`, to save the open dialog's event from a custom form.

### Changed
- The `<Scheduler>` runs on the calendar engine (same props, same callbacks). With a custom `renderEventForm`, `onEventUpdate` now receives the full event merged with the form's fields, and the form closes after saving.
- Without `view` / `date`, `onViewChange` / `onDateChange` no longer freeze the Scheduler: its own view and date update too.
- The React entries share the engine through `calendarkit-pro/core` instead of bundling a copy: the main bundle is about 3 kB smaller.

## 2.0.0-alpha.0

Pre-release on the `next` dist-tag (`latest` stays on 1.4.x). The `<Scheduler>` is unchanged.

### Added
- `calendarkit-pro/core`, the framework-agnostic engine of 2.0: `createCalendar` (controlled or uncontrolled events with `onEventsChange`, view and date, dialogs and drafts, move / resize / delete / duplicate with the 1.x callbacks, one-step undo), view models (`selectTimeGrid`, `selectMonth`, `selectAgenda`, `selectFlowDay`, `selectResources`), `layoutColumns` (overlaps that expand into free columns, extra events grouped into "+N") and `parseEventSentence` (English and French).

### Fixed
- Duplicating an all-day event on a daylight-saving day moves it by one calendar day.
- An occurrence lasting over a year no longer makes recurrence expansion scan decades back (look-back capped at one year, with a development warning).

## 1.4.0

### Added
- All-day and multi-day events: continuous bars in the month view, and a collapsible all-day row in the week and day views (2 lanes, then "+N more" / "Show less"). Timed events of 24 hours or more are shown with them. Lane packing ported from #1 by @HannanSolo.
- Drag a bar to move it by whole days (recurring series included) or stretch its right edge; click the all-day row to create an all-day event.
- All Day switch in the event form: it shows the last day included and saves an exclusive end. `renderEventForm` receives `initialAllDay`.
- Translation keys `showLess`, `continuesBefore`, `continuesAfter`, `durationDay`, `durationDays` (en/fr).

### Changed
- The week and day views always show the all-day row (one empty lane when there are no all-day events).
- Month cells share their height between bars and timed events, so nothing is clipped; the "+N more" link is slightly more compact.
- Size budget raised to 35 kB.

### Fixed
- Multi-day and all-day events no longer appear only on their first day in the month view, or as full-height blocks in the time grid.
- Date-only all-day values (`new Date('2026-10-12')`) no longer last one day too long east of Greenwich, or start the day before west of it; all-day series no longer drift when the display timezone differs from the browser's.
- `dist/` is ignored by git.

## 1.3.1

### Fixed
- The whole interface is translated (event form, views, sidebar, accessible labels); times in the event form follow the locale.
- Right-clicking an event opens the context menu (edit, duplicate, delete) — it was never wired. Disabled in `readOnly`.
- `readOnly` also hides the mobile create button, makes time slots non-clickable and ignores drops.
- "+N more" in the month view opens that day; the view animation no longer replays on every date click within the same period.
- Moving a recurring series also moves `recurrence.until`; occurrences starting in the previous month are no longer missed.
- The month skeleton is deterministic (no SSR hydration mismatch).
- Calendar colours are validated and no longer injected into a `<style>` tag.

### Changed
- No placeholder data inside the component: the sidebar lists calendars only when `calendars` is passed, guests are typed (or pasted) as emails instead of picked from fake suggestions, and attachments are only downloadable when they have a `url`.
- The event form's calendar selector is hidden when no `calendars` are passed (it offered an empty list).
- The location in the event view is a link to a maps search.
- Attachment links only open http(s), mailto, blob or relative URLs.
- Icon-only buttons have accessible names; the active view is announced as pressed.

## 1.3.0

### Added
- `recurrence.exdates` to exclude occurrences, and `onOccurrenceDelete(occurrence, updatedSeries)` to delete a single occurrence of a recurring event.

### Fixed
- Recurring events: `byweekday` is honoured, occurrences keep their wall-clock time across daylight-saving changes, and moving, resizing, editing or duplicating one occurrence no longer corrupts the series.
- `onEventDrop` is now called when an event is dropped (alongside `onEventUpdate`).
- Week, day, agenda and resource views use the `timezone` prop everywhere ("today", the current-time line, initial scroll, grouping); overlapping events are laid out in columns, and events crossing midnight are split per day.
- Clicking a slot in the resource view pre-assigns that resource to the new event.

### Changed
- Events with an invalid date or an end before their start are skipped (with a development warning) instead of rendering incorrectly; duplicate ids are still rendered but warned about.
- Computations are cached per event object: treat events as immutable (pass a new object to change one).
- Faster rendering: cached recurrence expansion, day buckets, layouts and `Intl` formatters; memoized grid cells and event blocks.

## 1.2.1

### Fixed
- The published bundle now starts with the `"use client"` directive. It was stripped by the build in 1.1.0 and 1.2.0, so Next.js App Router users had to wrap the component in their own client file.

### Changed
- Sourcemaps are no longer published (unpacked size ~970 kB → ~330 kB). The bundle stays unminified and readable.
- Removed unused dependencies `@dnd-kit/sortable` and `@tanstack/react-virtual`.
- Removed the internal, never-exported `lib/ics.ts`: ICS import/export was never reachable from the package API or UI despite earlier docs. It will come back as a real feature in a future version.

### Internal
- Test suite (Vitest + Testing Library), ESLint 9, knip, publint, attw and size-limit, chained in `npm run ci`.
- Lightweight CI on pull requests to `main`; releases are published from GitHub releases via npm Trusted Publishing with provenance.

## 1.2.0

### Features
- Per-event `draggable` / `resizable` flags on `CalendarEvent` to lock individual events (#4, thanks @jesusvillamarin)

### Bug Fixes
- Event resizing now persists (stale closure in `ResizableEvent`) and is no longer hijacked by drag (#3)
- Month view grid and weekday headers share the same week start, derived from the `locale` (#3, fixes #5)
- `language` / `locale` / `translations` are honored in Agenda view, Sidebar, mini calendar, context menu and drag overlay (#3, thanks @eduBKR)
- Times follow the locale's 12h/24h clock convention in every view (#3)
- `CalendarTranslations` type is now derived from the built-in English pack and lists every key

## Features Added

### Event Resizing
- `components/dnd/ResizableEvent.tsx` - Drag bottom edge to resize events
- 15-min snap intervals, visual feedback during resize
- Props: `onEventResize` callback in Scheduler

### Notification Reminders
- `EventReminder` type in `types.ts`
- Reminder UI in `EventModal.tsx` with predefined options (5/10/15/30min, 1h, 1d)
- Stored in `event.reminders[]`

### Import/Export ICS
- `lib/ics.ts` - Full ICS generation/parsing
- Supports: recurring events, all-day, attachments
- UI in Sidebar with Import/Export buttons

### Mobile Swipe Gestures
- `hooks/useSwipeGesture.ts`
- Swipe left/right to navigate dates
- Configurable threshold (50px default)

### Skeleton Loading
- `components/Skeleton.tsx`
- Per-view skeletons: Month, Week, Day, Agenda
- Auto-displayed when `isLoading=true`

### Empty States
- `components/EmptyState.tsx`
- View-specific illustrations and messages
- CTA button to create events

### Context Menus
- `components/ContextMenu.tsx`
- Right-click: Edit, Delete, Duplicate
- `useEventContextMenu` hook

### Enhanced Drag Preview
- Improved styling with event color
- Shadow, rotation effects, drag grip indicator

### Enhanced Agenda View
- Modern card design with date boxes
- "Today"/"Tomorrow" labels
- Duration, guests, attachments badges
- Staggered animations

### Dark Mode Polish
- `globals.css` updated
- Better contrast, custom scrollbars
- Glass effects, smooth transitions
- Better shadows/focus states

### Page Transitions
- Framer Motion animations on view switch
- Animated sidebar toggle
- Scale/fade effects

## Bug Fixes
- Timezone dropdown transparency (bg-background instead of bg-popover)
- Day view overlapping events (ported WeekView positioning logic)
- ringColor TypeScript error (changed to boxShadow)
- **Timezone drag/drop bug** - Events now correctly convert between display timezone and storage time using `fromZonedTime`

## New Files
```
components/dnd/ResizableEvent.tsx
components/Skeleton.tsx
components/EmptyState.tsx
components/ContextMenu.tsx
hooks/useSwipeGesture.ts
lib/ics.ts
```

## Modified Files
```
index.tsx - Added resize, context menu, swipe, skeleton integration
types.ts - Added EventReminder, EventAttachment types
EventModal.tsx - Complete UI rework, reminders, color picker
Sidebar.tsx - Import/Export UI, styling
AgendaView.tsx - Complete redesign
WeekView.tsx - ResizableEvent integration
DayView.tsx - ResizableEvent, overlapping fix
globals.css - Dark mode polish
```

## Props Added to Scheduler
- `onEventResize?: (event, start, end) => void`
- Events now support: `reminders`, `attachments`, `guests`
