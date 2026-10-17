# Pro-Scheduler Changelog

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
