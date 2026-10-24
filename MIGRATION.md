# Migrating from 1.x to 2.0

This page lists every breaking change of 2.0, why it was made and what to do. Most 1.x code keeps working as is: every example of the 1.4 README runs unchanged on 2.0 (it is part of the test suite).

## Styles: no Tailwind setup

The calendar ships its own compiled stylesheet and adds it to the page once.

- Remove `'./node_modules/calendarkit-pro/**/*.{js,mjs}'` from your Tailwind `content` (optional: keeping it changes nothing).
- Your own CSS variables `--primary`, `--background`… no longer theme the calendar, so your design system and the calendar cannot clash. Pass the same colours through `theme={{ colors: { … } }}`, or set the `--ck-*` variables on `.ck-root` (see the README, Theming).
- With a Content-Security-Policy that forbids inline styles: `injectStyles={false}` and `import 'calendarkit-pro/styles.css'`.

## Default theme

**Why:** a neutral default that fits any product, with WCAG AA contrast in light and dark.

**What to do:** `theme="vivid"` for a look close to 1.x. A 1.x `theme` object keeps working (it applies on top of `calm`); add `preset: 'vivid'` to it to start from the 1.x colours.

## `cn` is no longer exported

**Why:** it wrapped `clsx` and `tailwind-merge`, two dependencies the calendar no longer needs, and has nothing to do with calendars.

**What to do:** keep your own copy.

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))
```

## Creating events

**Why:** spec 2.0 creates events in place (quick card, Undo toast) and never makes up values.

**What changes:** a click on a free slot opens the quick card instead of the full form (with `renderEventForm`, your form still opens). New events no longer get the colour `#3b82f6` nor a "30 minutes before" reminder, and choosing a calendar no longer copies its colour into `event.color`: events without a colour take their calendar's. Pass `color` or `reminders` yourself if you relied on those defaults.

## Clicking an event

**Why:** spec 2.0 (Classic layout) shows an event's details in a card next to it and keeps the full form for editing.

**What changes:** a click on an event opens that card (Edit, Duplicate, Delete) instead of the form's read-only view, and the form opens ready to edit. With `renderEventForm` (or `components.EventEditor`), a click still opens your form with the event, and `onEventClick` is still called first. **Edit** in the event's right-click menu now opens the form directly and no longer calls `onEventClick`. Nothing to change in your code unless you relied on that call.

## Create and the full form

**Why:** spec 2.0 creates in place: one kind of card, beside what it belongs to.

**What changes:** **Create** (side panel, mobile button, empty agenda, a custom `Sidebar`'s `onCreate`) opens the quick card at the next free hour instead of the full form; "More options" opens the form. The form is a card beside the event, not a centred dialog. With `renderEventForm` or `components.EventEditor`, your form opens as before, at the time Create picked.

The quick card no longer has duration chips nor a Cancel button: change the times in the card (or drag over the grid), and close it with its close button, Escape or a click outside. The built-in form now shows and saves times in `timezone` (it used the machine's zone); a form of your own still receives instants, as in 1.x.

## Events and slots are buttons

**Why:** spec 2.0 (accessibility): everything reachable with Tab and named in full for screen readers.

**What changes:** events (blocks, all-day bars, month chips, agenda items, resource blocks), time slots and all-day cells are now `<button>` elements, and the drag wrappers around events lose their `role="button"`, `tabindex` and `aria-roledescription` attributes. If your CSS targets `div.ck-event`, or your tests look events up by `[aria-roledescription="draggable"]`, select by `.ck-event`, `[data-ck-event-id]` or the button's accessible name instead. The `continuesBefore` and `continuesAfter` labels are no longer used (the bar's name gives its dates).

## Phone layout

**Why:** spec 2.0 (mobile): under 768 px the calendar has a layout of its own.

**What changes:** the switch follows the calendar's own width, not the window's. Under 768 px: the day view first (only when you don't pass `view`), the side panel as a drawer, dialogs as bottom sheets, the month as day buttons with dots. From 768 px the side panel is shown as a column (it used to be hidden below 1024 px of window: close it with the menu button, or pass a `components.Sidebar` of your own). The floating Create button is no longer in the page outside the phone layout: if your tests clicked it, use the side panel's Create.
