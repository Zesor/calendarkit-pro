# Pro-Scheduler Changelog

## 2.0.0

The new CalendarKit: rebuilt on a framework-free engine, redesigned, accessible and ready for phones. Upgrading from 1.x: see [MIGRATION.md](MIGRATION.md); every example of the 1.4 README still runs unchanged. The pre-releases below list every change in detail.

### Highlights
- **No setup.** The calendar ships its own compiled, scoped stylesheet: no Tailwind configuration, nothing to import (`calendarkit-pro/styles.css` remains available as a file).
- **Redesigned.** Three themes (Calm, Vivid, Editorial) in light and dark, every colour a CSS variable, event colours adjusted to WCAG AA contrast.
- **Create in place.** Click or drag over free time; the quick card understands sentences ("Lunch with Lea tomorrow 1pm for 2h") in English and French. Every change shows Undo; the event card opens beside the event.
- **Three layouts.** Classic, Focus (the grid under a floating toolbar, editing in a side panel) and Flow (the day as a feed with free slots to book).
- **Time grid.** Visible hours, slot length, working hours, reversed time axis (issue #2), drag to create.
- **Phones.** Under 768 px of calendar width: day view, drawer, bottom sheets, 44 px targets, a month of day buttons.
- **Accessible.** Every event and slot is a named button; dialogs trap and return the focus; no keyboard shortcuts to learn.
- **Places.** Optional location suggestions (`placeSearch`, `photonPlaces()` for OpenStreetMap).
- **Integration.** Uncontrolled mode (`defaultEvents`, `onEventsChange`), `classNames`, `components`, server rendering with React 18 and 19.
- **Headless.** `calendarkit-pro/core` (the engine, no React) and `calendarkit-pro/react` (hooks and helpers) to build your own calendar UI.

### Removed
- The root `cn` export, deprecated in 1.4.1.

## 2.0.0-beta.1

Pre-release on the `next` dist-tag (`latest` stays on 1.4.x). The API is complete: from here to 2.0.0, fixes only.

### Added
- `ToolbarProps.compact`: a custom `components.Toolbar` knows when the calendar is in its phone layout.
- Drag announcements in the calendar's language (new keys `dragStart`, `dragEnd`, `dragCancel`), and no English keyboard instructions left for screen readers (dragging is a pointer gesture; the event form is the keyboard way).
- Colour swatches named by colour (new keys `colorBlue` … `colorIndigo`).

### Fixed
- After a delete, the focus goes to the hour the event was in (its day for an all-day event) instead of being lost.
- A host's own form (`renderEventForm`, `components.EventEditor`) gives the focus back to what opened it when it closes.
- Time zone choices in the side panel are buttons, reachable with the keyboard; the current one is marked.
- React 18 server rendering no longer warns about `useLayoutEffect`, and a day or week view of today hydrates without a mismatch (the current-time line appears once mounted).
- The phone layout leaves room under the floating Create, so the last events are not hidden behind it.

### Changed
- Scheduler budget: 59 kB brotli (was 58 kB).

### Internal
- Every example of the 1.4.1 README runs as a test (the 1.x contract); server rendering is tested without a DOM, hydration without warnings; CI runs the suite with React 18 too, and on both 2026 clock changes (`npm run test:dst`).

## 2.0.0-alpha.11

Pre-release on the `next` dist-tag (`latest` stays on 1.4.x).

### Added
- Phone layout under 768 px of calendar width (measured on the calendar, not the window): the day view first when `view` is not controlled; a two-row header with Today always shown and 44 px targets; the side panel as a drawer (light scrim, close button, closes after a pick); the event card, the quick card and the full form as bottom sheets with their actions in view (Focus edits in a sheet, and picks its view from a menu); a month of day buttons with a dot per event; one floating Create.
- Mini-calendar days are named in full ("Thursday 15 October 2026") and say which one is selected.

### Changed
- The side panel follows the calendar's width instead of the window's: a calendar of 768 px or more shows it (it was hidden below 1024 px of window), a narrower one has the drawer.
- The floating Create button only appears in the phone layout (it was in the page, hidden by CSS, at every size).

### Fixed
- The Flow day strip keeps the chosen day in view on a phone.

## 2.0.0-alpha.10

Pre-release on the `next` dist-tag (`latest` stays on 1.4.x).

### Added
- Keyboard and screen reader support (no shortcuts: Tab, Enter, Space, Escape). Events, all-day bars, month chips, agenda items, resource blocks and Flow cards are native buttons with a full name (title, date, times, calendar, place); time slots and all-day cells are buttons that say what they create, one tab stop per hour; month day numbers open the day. A visible focus ring everywhere.
- Dialogs keep Tab inside them and give the focus back to what opened them when they close (an editor opened from the event card goes back to the event); the Focus panel gives it back without trapping Tab. The event just created, duplicated or moved takes the focus.

### Changed
- The drag wrappers around events are no longer tab stops (the event button inside them is): dragging stays a pointer gesture, with the event form as the alternative.
- Scheduler budget: 58 kB brotli (was 56 kB).

### Fixed
- Place search: its list stays in the document while closed (`aria-controls` always resolves) and one live region announces searching, no result and unavailable.
- Event card: the row icons no longer carry names that repeat the content; "1 event" instead of "1 events".

## 2.0.0-alpha.9

Pre-release on the `next` dist-tag (`latest` stays on 1.4.x).

### Added
- `layout="focus"`: the grid takes the whole calendar, under a floating toolbar (period, Today, previous / next, views, Create); a click on an event edits it in a side panel docked beside the grid (while it has changes, a click on the grid asks first). `layout="flow"`: the week's days as a strip (dots for how busy each day is), the day as a feed of cards in order with free slots to book (an hour at their start) and the current time, a floating Create; the full form opens as a bottom sheet. `layout="classic"` stays the default. New type `CalendarLayout`.

### Changed
- Scheduler budget: 56 kB brotli (was 52 kB).

### Fixed
- Week view: the current-time line and its badge were drawn over the day header when the grid was scrolled past them; the header now stays above everything that scrolls and is opaque.
- Working hours read as a band: the time outside them is hatched, with a line where work starts and ends (it was a faint flat tint, so the working hours looked like a stray white box).

## 2.0.0-alpha.8

Pre-release on the `next` dist-tag (`latest` stays on 1.4.x).

### Added
- Place search in the form's Location field: `placeSearch` (off by default) and the `photonPlaces()` adapter (OpenStreetMap, no key). Suggestions as you type, a chosen place saved as `event.place` with a map card, "Open in Maps" and "Directions" in the form and the event card; a video link is kept as typed. New types `Place` and `PlaceSearch`.

### Changed
- **Create** opens the quick card at the next free hour today (the week and day views go there first), like a click in the grid; with `renderEventForm`, your form opens at that time.
- The full form is a card beside the event or the new event (which stays drawn in the grid), no longer a dialog over a dimmed, blurred calendar.
- The quick card is laid out like the quick event of the big calendars: a close button, the title, then one row each for the date and times (edited in place), guests, location (place search included), description and calendar, and More options and Save. Guests, location and description are saved with the event or carried to "More options"; the duration chips and Cancel are gone. The new event is drawn solid in the grid, with its title and times.
- Scheduler budget: 52 kB brotli (was 48 kB).

### Fixed
- The full form showed and saved times in the machine's time zone instead of the calendar's `timezone`.

## 2.0.0-alpha.7

Pre-release on the `next` dist-tag (`latest` stays on 1.4.x).

### Added
- Configurable time grid for the week, day and resource views: `dayStartHour` and `dayEndHour` (events are cut at those hours), `slotDuration` (5 to 60 minutes; clicks, drops, resizes and drag selection snap to it), `reverseTimeAxis` (the latest hours on top, issue #2), `workingHours` (time outside it is shaded) and `scrollToHour` (where the grid opens). New exported type `WorkingHours`.
- Drag over free time with a mouse or a pen to create an event over that range: the quick card opens with it.

### Changed
- Scheduler budget: 48 kB brotli (was 46 kB).

## 2.0.0-alpha.6

Pre-release on the `next` dist-tag (`latest` stays on 1.4.x).

### Changed
- The event card opens beside the event instead of over it (below or above an event too wide to sit beside, next to the pointer when the event cannot be measured), stays inside the window, and lists the date, times and length, location, guests, reminders, calendar, attachments and description on icon-led rows.
- The quick card opens beside the new event drawn in the grid; the words it understood are highlighted.
- The full form is redesigned: one labelled row per part (When, Calendar, Location, Guests, Reminders, Description), reminders as removable chips with "Add reminder", a native calendar menu with its colour, and a footer that stays in view (the calendar's height and the window's). Closing with changes asks in that footer.
- Dialogs are announced as dialogs (`role="dialog"`, named by their heading).
- Reminders are labelled from their minutes in the calendar's language, in the form as in the event card: a `label` stored on a reminder is no longer displayed.

## 2.0.0-alpha.5

Pre-release on the `next` dist-tag (`latest` stays on 1.4.x).

### Added
- Uncontrolled mode: `defaultEvents` and `onEventsChange`. The calendar keeps the list itself; `onEventsChange` receives the whole list after every change (also in controlled mode). The event just created is outlined in this mode too.
- `classNames` for `root`, `toolbar`, `sidebar`, `event`, `slot`, `allDayBar` and `dialog`.
- `components`: your own `EventContent`, `EventEditor` (equivalent to `renderEventForm`), `Toolbar`, `Sidebar` and `EmptyState`, with exported prop types.
- A click on an event opens a card next to it (date and time, calendar, location, guests, reminders, attachments, description) with Edit, Duplicate and Delete. It stays inside the window and keeps its place while open.

### Changed
- The form no longer has a read-only view: it opens from the card's Edit (or the event menu's Edit) ready to edit.

## 2.0.0-alpha.4

Pre-release on the `next` dist-tag (`latest` stays on 1.4.x).

### Added
- Quick create: a click on a free slot opens a compact card with the new event drawn dashed in the grid. The title is understood as a sentence ("Lunch with Lea tomorrow 1pm", in English or French) and the card shows what it understood; duration chips, a calendar menu, an overlap warning, "More options" (the full form, prefilled), Enter to save.
- Undo toast after every change (create, edit, move, resize, duplicate, delete), for 6 seconds; the event just changed is outlined briefly. Undo of a create also reaches hosts that give new events their own id (`onEventDelete` receives the host's id).
- Closing the quick card or the form with changes asks "Discard changes?".

### Changed
- New events get no default colour or reminder, and picking a calendar no longer copies its colour into the event (see MIGRATION.md).
- The `language` prop also sets the language the titles are understood in.
- `calendarkit-pro/core` budget: 12.1 kB brotli (was 12 kB).

## 2.0.0-alpha.3

Pre-release on the `next` dist-tag (`latest` stays on 1.4.x).

### Added
- Calendar colours: an event takes its own colour, else its calendar's, else its resource's, else the theme's. Hex and `rgb()` colours become a solid fill and two inks that keep every text at 4.5:1 or more, in light and dark.
- Events are drawn per theme: tint and coloured text (calm), solid colour and white text (vivid), card with a coloured top edge (editorial); today's date follows the theme too (rounded square, circle, underline).
- Week and day blocks adapt to their size: the title alone under 22 px, "Title · 9:00" under 44 px (the time from 130 px wide), then the title over up to three lines and the times; narrow columns keep the title only. The full text is in the tooltip.
- Overlaps: events stretch into free columns; past 2 or 3 columns in the week (4 in the day view), the rest collapse into a "+N" button that lists them, and each one opens its event.
- `--ck-warning`, `--ck-event`, `--ck-event-ink-light` and `--ck-event-ink-dark` tokens.

### Changed
- Month days show up to three chips (calendar-coloured dot and title), with "+N more" next to the day number.
- The last fixed colours (drop and hover tints, the mobile create button, the timezone button, the empty state, reminders, delete actions) come from the theme.
- No more coloured side stripe on events and the drag preview.

## 2.0.0-alpha.2

Pre-release on the `next` dist-tag (`latest` stays on 1.4.x). Breaking changes are listed in [MIGRATION.md](MIGRATION.md).

### Added
- The `<Scheduler>` brings its own stylesheet (Tailwind v4 compiled by the library, every class prefixed with `ck:`, a reset scoped to `.ck-root`) and adds it to the page once: no Tailwind setup, no CSS import. `calendarkit-pro/styles.css` and `injectStyles={false}` cover strict Content-Security-Policies.
- Themes: `theme="calm" | "vivid" | "editorial"` or `{ preset, colors, fontFamily, borderRadius }`, each in light and dark, and `mode="light" | "dark" | "system"`. Theme colours are `--ck-*` CSS variables with text contrast of at least 4.5:1. A few accents (drop and hover tints, reminders, the empty state, the mobile create button) still use fixed colours until the next pre-release.

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

## 1.4.1

### Deprecated
- The root `cn` export (clsx + tailwind-merge) is removed in 2.0. Copy it into your project: `const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))`. Calling it logs a one-time warning in development.

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
