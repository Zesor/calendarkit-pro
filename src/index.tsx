import React, { useCallback, useId, useState, useMemo, useRef } from 'react';
import { Modifier, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { CalendarHeader } from './components/CalendarHeader';
import { FocusBar } from './components/FocusBar';
import { FlowView } from './views/FlowView';
import { selectFlowDay } from './core/models/lists';
import { Sidebar } from './components/Sidebar';
import { MonthView } from './views/MonthView';
import { WeekView } from './views/WeekView';
import { DayView } from './views/DayView';
import { AgendaView } from './views/AgendaView';
import { ResourceView } from './views/ResourceView';
import { EventModal } from './components/EventModal';
import { MoreEventsDialog } from './components/MoreEventsDialog';
import { QuickCreate, QuickExtra } from './components/QuickCreate';
import { EventPopover } from './components/EventPopover';
import { Drawer } from './components/Drawer';
import { nextFreeSlot } from './views/nextFreeSlot';
import { Box } from './components/placement';
import { UndoToast } from './components/UndoToast';
import { MonthViewSkeleton, WeekViewSkeleton, DayViewSkeleton, AgendaViewSkeleton } from './components/Skeleton';
import { EventContextMenu, useEventContextMenu } from './components/ContextMenu';
import { CalendarProps, CalendarEvent, CalendarClassNames, CalendarComponents, ViewType } from './types';
import { cx } from './utils';
import { colorMode, getThemeStyles, themePreset } from './lib/theme';
import { resolveTranslations, timeFormats } from './core/format';
import { fromDisplay, toDisplay } from './core/timezone';
import { resolveWeekStartsOn } from './core/week';
import { useCalendar, useCalendarSelector } from './react/useCalendar';
import { CalendarDndContext } from './react/dnd';
import { useStableCallback } from './hooks/useStableCallback';
import { addDays, format, startOfWeek } from 'date-fns';
import { useCompact } from './hooks/useCompact';
import { useViewSwipe } from './hooks/useSwipeGesture';
import { dragOverlaySize } from './components/dnd/dragOverlay';
import { restrictToWindowEdges, snapToGrid } from './components/dnd/modifiers';
import { CalendarStyles, useMissingStylesWarning } from './styles/CalendarStyles';
import { EventLabelProvider, eventLabel } from './components/eventLabel';
import { EventColorProvider, eventColorStyle, resolveEventColor } from './components/eventColor';
import { ClassNamesProvider, ComponentsProvider } from './components/customize';
import { resolveTimeGrid } from './views/grid';

// Re-export types for consumers
export type {
  ViewType,
  CalendarEvent,
  CalendarProps,
  CalendarTheme,
  CalendarTranslations,
  EventType,
  Resource,
  EventReminder,
  EventAttachment,
  ThemeColors,
  ThemePreset,
  ColorMode,
  CalendarClassNames,
  CalendarComponents,
  EventContentProps,
  EventEditorProps,
  ToolbarProps,
  SidebarProps,
  EmptyStateProps,
  WorkingHours,
  CalendarLayout,
  Place,
  PlaceSearch,
} from './types';
export { photonPlaces } from './places';

const NO_CLASSES: CalendarClassNames = {};

/** What a press landed on: the event's box when it has one (the card opens beside it), else the point. */
function pressedBox(e: React.PointerEvent): Box {
  const box = (e.target as Element).closest?.('.ck-event, [data-ck-event]')?.getBoundingClientRect();
  return box && box.width > 0 ? box : { left: e.clientX, right: e.clientX, top: e.clientY, bottom: e.clientY };
}
/** Enter or Space on an event button: the card opens beside that event (no pointer involved). */
function keyedBox(e: React.KeyboardEvent): Box | null {
  const box = (e.target as Element).closest?.('.ck-event, [data-ck-event]')?.getBoundingClientRect();
  return box && box.width > 0 ? box : null;
}
const NO_COMPONENTS: CalendarComponents = {};


export const Scheduler: React.FC<CalendarProps> = ({
  events,
  defaultEvents,
  onEventsChange,
  view: controlledView,
  onViewChange: controlledOnViewChange,
  date: controlledDate,
  onDateChange: controlledOnDateChange,
  onEventClick,
  onEventCreate,
  onEventUpdate,
  onEventDelete,
  onEventDrop,
  onEventResize,
  onOccurrenceDelete,
  timezone,
  onTimezoneChange,
  className,
  theme,
  mode,
  renderEventForm,
  readOnly,
  calendars,
  resources,
  eventTypes,
  onCalendarToggle,
  isLoading,
  isDarkMode,
  onThemeToggle,
  translations, // New Prop
  hideViewSwitcher,
  language,
  onLanguageChange,
  locale, // Date-fns locale
  injectStyles = true,
  classNames = NO_CLASSES,
  components = NO_COMPONENTS,
  placeSearch,
  dayStartHour,
  dayEndHour,
  slotDuration,
  reverseTimeAxis,
  workingHours,
  scrollToHour,
  layout = 'classic',
}) => {
  const [activeDragEvent, setActiveDragEvent] = useState<CalendarEvent | null>(null);
  const [activeDayDrag, setActiveDayDrag] = useState(false);

  // Context menu state
  const {
    contextMenuEvent,
    contextMenuPosition,
    openContextMenu,
    closeContextMenu,
  } = useEventContextMenu();

  // The calendar engine (calendarkit-pro/core) holds view, date, events and dialogs; the Scheduler
  // keeps only UI state (sidebar, drag ghost, context menu).
  const calendar = useCalendar({
    events,
    defaultEvents,
    onEventsChange,
    view: controlledView,
    onViewChange: controlledOnViewChange,
    date: controlledDate,
    onDateChange: controlledOnDateChange,
    onEventCreate,
    onEventUpdate,
    onEventDelete,
    onEventDrop,
    onEventResize,
    onOccurrenceDelete,
    readOnly,
    timezone,
    language,
    stripGeneratedIds: true,
  });
  const view = useCalendarSelector(calendar, (s) => s.view);
  const currentDate = useCalendarSelector(calendar, (s) => s.date);
  const expandedEvents = useCalendarSelector(calendar, (s) => s.occurrences);
  const dialog = useCalendarSelector(calendar, (s) => s.dialog);
  const lastChange = useCalendarSelector(calendar, (s) => s.lastChange);
  // The event just created or moved gets a brief outline and the focus (spec §8.6).
  const [landedId, setLandedId] = useState<string>();
  // Events shown before the last change: an event created through a 1.x host comes back under the
  // host's own id, found like undo finds it (an id not shown before, with the same title).
  const shownEvents = useRef(expandedEvents);
  shownEvents.current = expandedEvents;
  const shownIds = useRef(new Set<string>());
  React.useEffect(() => {
    if (!lastChange || lastChange.kind === 'delete') return setLandedId(undefined);
    setLandedId(lastChange.eventId);
    const before = shownIds.current;
    // A frame later, after a closing dialog gave the focus back, and once the key press that saved is over
    // (it would click the event). Not found (a day not shown): left where it is.
    const frame = requestAnimationFrame(() => {
      const all = [...(rootRef.current?.querySelectorAll<HTMLElement>('[data-ck-event-id]') ?? [])];
      const find = (id: string) => all.find((el) => el.dataset.ckEventId === id);
      let landed = find(lastChange.eventId);
      const hostId = !landed && lastChange.kind === 'create' ? shownEvents.current.find((e) => !before.has(e.id) && e.title === lastChange.title)?.id : undefined;
      if (hostId) {
        landed = find(hostId);
        setLandedId(hostId);
      }
      (landed?.matches('button') ? landed : landed?.querySelector('button'))?.focus();
    });
    const timer = setTimeout(() => setLandedId(undefined), 1600);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [lastChange]);
  // After the effect above, which reads the ids shown before the change.
  React.useEffect(() => {
    shownIds.current = new Set(expandedEvents.map((e) => e.id));
  }, [expandedEvents]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  // Phone layout: the side panel is a drawer, closed until the menu opens it.
  const [drawerOpen, setDrawerOpen] = useState(false);

  // The 1.x modal reads the dialog: an event being shown or edited, or a new event at a slot.
  const editingId = dialog?.kind === 'event' || dialog?.kind === 'editor' ? dialog.eventId : undefined;
  // Like 1.x, the form gets a snapshot of the event taken when it opened: new event objects from the
  // parent (a refetch) do not reset what the user is typing, and the last event stays available
  // after the form closes (exit animations, a save that comes after onClose).
  const lastOpened = useRef<{ id?: string; event: CalendarEvent | null }>({ event: null });
  // What the last press landed on: the event card opens beside it, and keeps that place while open.
  const pointer = useRef<Box | null>(null);
  const anchor = useRef<{ dialog: unknown; at: Box | null }>({ dialog: null, at: null });
  if (dialog?.kind === 'event' && anchor.current.dialog !== dialog) anchor.current = { dialog, at: pointer.current };
  const rootRef = useRef<HTMLDivElement>(null);
  useMissingStylesWarning(rootRef, injectStyles);
  // Spec §8.9: under 768 px of calendar width, the phone layout. An uncontrolled view starts on the day.
  const compact = useCompact(rootRef);
  const compactViewSet = useRef(false);
  React.useEffect(() => {
    if (!compact || compactViewSet.current) return;
    compactViewSet.current = true;
    if (controlledView === undefined) calendar.setView('day');
  }, [compact, controlledView, calendar]);
  if (dialog && dialog.kind !== 'more') {
    if (editingId === undefined) lastOpened.current = { event: null };
    else if (lastOpened.current.id !== editingId) lastOpened.current = { id: editingId, event: expandedEvents.find((e) => e.id === editingId) ?? null };
  }
  const selectedEvent = lastOpened.current.event;
  const draft = dialog?.kind === 'quick' || dialog?.kind === 'editor' ? dialog.draft : undefined;
  const quickDraft = dialog?.kind === 'quick' ? dialog.draft : undefined;
  // In the order the grid listed them (by start time), not the order of the events prop.
  const moreEvents = useMemo(() => {
    if (dialog?.kind !== 'more') return [];
    const byId = new Map(expandedEvents.map((event) => [event.id, event]));
    return dialog.eventIds.flatMap((id) => byId.get(id) ?? []);
  }, [dialog, expandedEvents]);
  const modalInitialDate = editingId === undefined ? draft?.start : undefined;
  const modalInitialAllDay = editingId === undefined && !!draft?.allDay;
  // "More options" from quick create: the editor opens with what the card already has.
  // What the quick card added (guests, location, description) goes along with "More options".
  const [quickExtra, setQuickExtra] = useState<QuickExtra>({});
  const modalInitialValues = useMemo(() => {
    if (editingId !== undefined || !draft) return undefined;
    return { title: draft.savedTitle, end: draft.end, ...(draft.calendarId ? { calendarId: draft.calendarId } : {}), ...quickExtra };
  }, [editingId, draft, quickExtra]);

  // Stable handlers (the store's actions never change identity).
  const { EventEditor, Toolbar, Sidebar: CustomSidebar } = components;
  const hasCustomForm = !!(renderEventForm || EventEditor);
  // Classic: a click on an event opens the popover; the editor opens from its Edit (a 1.x custom form
  // still opens on the click).
  // The new event stays drawn in the grid while its full form is open (not under a host's own form).
  const ghostDraft = quickDraft ?? (dialog?.kind === 'editor' && dialog.eventId === undefined && !hasCustomForm ? dialog.draft : undefined);
  const popoverEvent = dialog?.kind === 'event' && !hasCustomForm ? selectedEvent : null;
  const isModalOpen = dialog !== null && dialog.kind !== 'more' && dialog.kind !== 'quick' && !popoverEvent;
  const handlers = useMemo(() => ({
    handleViewChange: calendar.setView,
    handleDateChange: (date: Date) => calendar.navigate(date),
    handlePrev: () => calendar.navigate('prev'),
    handleNext: () => calendar.navigate('next'),
    handleToday: () => calendar.navigate('today'),
    handleDateClick: (date: Date) => {
      calendar.navigate(date);
      calendar.setView('day');
    },
    // Quick create, or the custom form of a 1.x host (renderEventForm) as before.
    handleTimeSlotClick: (date: Date, resourceId?: string) => calendar.openSlot(date, { resourceId, editor: hasCustomForm }),
    // A drag over free time: quick create with that range (a custom form gets its start, as for a click).
    handleTimeRangeSelect: (start: Date, end: Date) => calendar.openSlot(start, { end, editor: hasCustomForm }),
    handleAllDaySlotClick: (day: Date) => calendar.openSlot(day, { allDay: true, editor: hasCustomForm }),
    handleModalSave: (data: Partial<CalendarEvent>) => calendar.saveEvent(data, { eventId: lastOpened.current.id ?? null }),
    handleModalDelete: (eventId: string) => calendar.remove(eventId),
    handleModalClose: () => calendar.closeDialog(),
    handleEventDelete: (event: CalendarEvent) => calendar.remove(event.id),
    handleEventDuplicate: (event: CalendarEvent) => calendar.duplicate(event.id),
    handleEventResize: (event: CalendarEvent, newEnd: Date) => calendar.resize(event.id, newEnd),
    handleDayEventResize: (event: CalendarEvent, newLastDay: Date) => calendar.resizeDays(event.id, newLastDay),
    handleMoreClick: (events: CalendarEvent[]) => calendar.openMore(events.map((event) => event.id)),
  }), [calendar, hasCustomForm]);
  const {
    handleViewChange, handleDateChange, handlePrev, handleNext, handleToday, handleDateClick, handleTimeSlotClick,
    handleTimeRangeSelect, handleAllDaySlotClick, handleModalSave, handleModalDelete, handleModalClose, handleEventDelete,
    handleEventDuplicate, handleEventResize, handleDayEventResize, handleMoreClick,
  } = handlers;
  // 1.x: a click calls onEventClick, then opens the event unless readOnly.
  // Classic opens the event card; Focus and Flow edit at once, in a panel or a sheet (a host's form opens either way).
  const handleEventClickInternal = useStableCallback((event: CalendarEvent) => {
    onEventClick?.(event);
    if (readOnly) return;
    if (layout !== 'classic' && !hasCustomForm) calendar.openEditor(event.id);
    else calendar.openEvent(event.id);
  });

  const id = useId();

  // The side panel's content: a column on a wide calendar, a drawer on a phone (closed after a pick).
  const sidebarContent = (close?: () => void) => (
    <>
      {CustomSidebar ? (
        <CustomSidebar
          date={currentDate}
          onDateChange={(d: Date) => { handleDateChange(d); close?.(); }}
          onCreate={readOnly ? undefined : () => { close?.(); handleCreateEvent(); }}
          calendars={calendars}
          onCalendarToggle={onCalendarToggle}
        />
      ) : (
      <Sidebar
          currentDate={currentDate}
          onDateChange={(d: Date) => { handleDateChange(d); close?.(); }}
          onViewChange={(v: ViewType) => { handleViewChange(v); close?.(); }}
          onEventCreate={() => { close?.(); handleCreateEvent(); }}
          timezone={timezone}
          onTimezoneChange={onTimezoneChange}
          className="ck:w-full"
          readOnly={readOnly}
          calendars={calendars}
          onCalendarToggle={onCalendarToggle}
          translations={t}
          locale={locale}
      />
      )}
    </>
  );
  const toggleSidebar = () => (compact ? setDrawerOpen((open) => !open) : setIsSidebarOpen((open) => !open));
  const closeDrawer = React.useCallback(() => setDrawerOpen(false), []);

  // Mobile swipe gesture support
  const swipeRef = useViewSwipe<HTMLDivElement>(handlePrev, handleNext, true);

  // Built-in language pack + the consumer's overrides, memoized so children keep stable props (C6).
  const t = useMemo(() => resolveTranslations(language, translations), [language, translations]);

  // Every event surface's accessible name (spec §8.8).
  const labelEvent = useCallback((e: CalendarEvent) => eventLabel(e, { t, timezone, locale, calendars }), [t, timezone, locale, calendars]);

  // Drag ghost times follow the locale's clock convention.
  const overlayTimeFormat = timeFormats(locale).time;

  // Blocks of multi-day events share one event under several drag ids: read the event from the data.
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const draggedEvent = event.active.data.current?.event as CalendarEvent | undefined;
    if (draggedEvent) {
        setActiveDragEvent(draggedEvent);
        setActiveDayDrag(event.active.data.current?.grabDayOffset !== undefined);
    }
  }, []);

  // The drop itself is applied by CalendarDndContext (calendar.move); here we only clear the ghost.
  const onDragEndWrapper = useCallback(() => setActiveDragEvent(null), []);
  
  const dragSize = activeDragEvent ? dragOverlaySize(view, activeDragEvent, activeDayDrag) : {};

  // Filter events by active calendars. Keyed on the active ids (not the `calendars` array), so an
  // inline `calendars` prop does not recreate the list and defeat the grid caches.
  const activeCalendarKey = calendars ? calendars.filter(c => c.active !== false).map(c => c.id).join('\u0000') : null;
  const filteredEvents = useMemo(() => {
      if (activeCalendarKey === null) return expandedEvents;
      const activeCalendarIds = new Set(activeCalendarKey.split('\u0000'));
      // Events without a calendar are always shown.
      // String() keeps numeric ids (e.g. from JSON) matching, as `includes` did before.
      return expandedEvents.filter(e => !e.calendarId || activeCalendarIds.has(String(e.calendarId)));
  }, [expandedEvents, activeCalendarKey]);

  // U8: animate when the view or the displayed period changes, not on every date click inside it.
  const periodKey = view === 'month'
    ? format(currentDate, 'yyyy-MM')
    : view === 'week'
      ? format(startOfWeek(currentDate, { weekStartsOn: resolveWeekStartsOn(locale, 1) }), 'yyyy-MM-dd')
      : format(currentDate, 'yyyy-MM-dd');

  // The views are memoized: the grid keeps its identity while its props do not change (an inline
  // `workingHours` object is compared by value).
  const workingKey = workingHours && JSON.stringify(workingHours);
  const grid = useMemo(
    () => resolveTimeGrid({ dayStartHour, dayEndHour, slotDuration, reverseTimeAxis, workingHours: workingKey && JSON.parse(workingKey), scrollToHour }),
    [dayStartHour, dayEndHour, slotDuration, reverseTimeAxis, workingKey, scrollToHour],
  );
  // Drag ghost: snaps by one slot (1 px per minute at the week view's 60 px per hour), kept inside the window.
  const modifiers = useMemo<Modifier[]>(() => [snapToGrid(grid.slotMinutes), restrictToWindowEdges], [grid.slotMinutes]);

  // The built-in form edits the wall-clock times the grid shows (the display zone, like the quick
  // card); its dates go back to instants on save. A host's own form keeps the 1.x instants.
  const editorEvent = useMemo(
    () => (selectedEvent && !selectedEvent.allDay ? { ...selectedEvent, start: toDisplay(selectedEvent.start, timezone), end: toDisplay(selectedEvent.end, timezone) } : selectedEvent),
    [selectedEvent, timezone],
  );
  // An unchanged time keeps its instant (the hour repeated when clocks go back has two).
  const backToInstant = (wall: Date | undefined, shown: Date | undefined, instant: Date | undefined) =>
    wall && shown && instant && wall.getTime() === shown.getTime() ? instant : wall && fromDisplay(wall, timezone);
  const handleEditorSave = useStableCallback((data: Partial<CalendarEvent>) => handleModalSave(
    data.allDay ? data : {
      ...data,
      start: backToInstant(data.start, editorEvent?.start, selectedEvent?.start),
      end: backToInstant(data.end, editorEvent?.end, selectedEvent?.end),
    },
  ));

  // The quick card saves through the engine; with guests, a location or a description added, the
  // same fields as the engine's own save (title without the understood words, wall times to instants).
  const handleQuickSave = useStableCallback((extra: QuickExtra) => {
    if (!quickDraft || Object.keys(extra).length === 0) return calendar.saveDraft();
    const d = quickDraft;
    const instant = (date: Date) => (d.allDay ? date : fromDisplay(date, timezone));
    calendar.saveEvent({
      title: ((d.titleEdited && d.savedTitle) || d.title).trim() || 'Untitled',
      start: instant(d.start),
      end: instant(d.end),
      allDay: d.allDay || undefined,
      calendarId: d.calendarId,
      recurrence: d.recurrence,
      ...extra,
    }, { eventId: null });
  });

  // "Create" works like a click in the grid (spec §8.5): the quick card at the next free hour, today
  // (the week and day views go there first), or the host's form at that time.
  const handleCreateEvent = useStableCallback(() => {
    // Events drawn in the grid only: a day or longer is a bar above it and does not push the slot.
    const timed = filteredEvents.filter((e) => !e.allDay && e.end.getTime() - e.start.getTime() < 864e5).map((e) => ({ start: toDisplay(e.start, timezone), end: toDisplay(e.end, timezone) }));
    const start = nextFreeSlot(toDisplay(new Date(), timezone), timed, grid.startHour, grid.endHour);
    if (view === 'week' || view === 'day' || layout === 'flow') calendar.navigate(start);
    calendar.openSlot(start, { editor: hasCustomForm });
  });

  const slotClickHandler = readOnly ? undefined : handleTimeSlotClick;
  const rangeSelectHandler = readOnly ? undefined : handleTimeRangeSelect;
  const allDaySlotClickHandler = readOnly ? undefined : handleAllDaySlotClick;
  const contextMenuHandler = readOnly ? undefined : openContextMenu;

  // Flow: the day's feed from the engine's model, over the events the calendar shows (active calendars).
  const flowModel = useCallback(
    (day: Date, at: Date) => selectFlowDay({ ...calendar.getState(), visible: filteredEvents }, { day, now: at, fromHour: dayStartHour ?? 8, toHour: dayEndHour ?? 20 }),
    [calendar, filteredEvents, dayStartHour, dayEndHour],
  );

  // Focus: the grid stays live beside the panel; while the form has changes, a guard over the grid
  // asks first (as the Classic card's backdrop does), so nothing typed is lost to another click.
  const [editorDirty, setEditorDirty] = useState(false);
  const [closeRequest, setCloseRequest] = useState(0);

  const builtInEditor = (
    <EventModal
      isOpen={isModalOpen}
      onClose={handleModalClose}
      event={editorEvent}
      initialDate={modalInitialDate}
      onSave={handleEditorSave}
      onDelete={handleModalDelete}
      calendars={calendars}
      eventTypes={eventTypes}
      translations={t}
      initialAllDay={modalInitialAllDay}
      initialValues={modalInitialValues}
      placeSearch={placeSearch}
      variant={compact || layout === 'flow' ? 'sheet' : layout === 'focus' ? 'panel' : 'card'}
      onDirtyChange={setEditorDirty}
      closeRequest={closeRequest}
    />
  );

  return (
    <ClassNamesProvider value={classNames}>
    <ComponentsProvider value={components}>
    <EventColorProvider value={calendars}>
    <EventLabelProvider value={labelEvent}>
    <CalendarDndContext
        calendar={calendar}
        id={id}
        onDragStart={handleDragStart}
        onDragEnd={onDragEndWrapper}
        modifiers={modifiers}
    >
      <div
        ref={rootRef}
        onPointerDownCapture={(e) => { pointer.current = pressedBox(e); }}
        onKeyDownCapture={(e) => { if (e.key === 'Enter' || e.key === ' ') pointer.current = keyedBox(e); }}
        className={cx("ck-root ck:flex ck:flex-col ck:h-full ck:bg-background ck:text-foreground ck:relative", className, classNames.root)}
        style={getThemeStyles(theme)}
        data-ck-theme={themePreset(theme)}
        data-ck-mode={colorMode(mode, isDarkMode)}
        data-ck-layout={layout}
        data-ck-compact={compact || undefined}
      >
        {injectStyles && <CalendarStyles />}
        {layout === 'flow' ? (
          <FlowView
            date={currentDate}
            events={filteredEvents}
            model={flowModel}
            timezone={timezone}
            locale={locale}
            translations={t}
            onDateChange={handleDateChange}
            onEventClick={handleEventClickInternal}
            // An hour at the start of the free time (all of it when shorter).
            onBook={readOnly ? undefined : (start, end) => handleTimeRangeSelect(start, new Date(Math.min(end.getTime(), start.getTime() + 3600e3)))}
            onCreate={readOnly ? undefined : handleCreateEvent}
            toolbar={Toolbar && (
              <Toolbar
                date={currentDate}
                view={view}
                onPrev={() => handleDateChange(addDays(currentDate, -7))}
                onNext={() => handleDateChange(addDays(currentDate, 7))}
                onToday={handleToday}
                onViewChange={handleViewChange}
                onToggleSidebar={toggleSidebar}
              />
            )}
          />
        ) : (
        <>
        {Toolbar ? (
          <Toolbar
            date={currentDate}
            view={view}
            onPrev={handlePrev}
            onNext={handleNext}
            onToday={handleToday}
            onViewChange={handleViewChange}
            onToggleSidebar={toggleSidebar}
          />
        ) : layout === 'focus' ? (
          <FocusBar
            date={currentDate}
            view={view}
            locale={locale}
            translations={t}
            hideViewSwitcher={hideViewSwitcher}
            onPrev={handlePrev}
            onNext={handleNext}
            onToday={handleToday}
            onViewChange={handleViewChange}
            onCreate={readOnly ? undefined : handleCreateEvent}
            compact={compact}
          />
        ) : (
        <CalendarHeader
          currentDate={currentDate}
          onPrev={handlePrev}
          onNext={handleNext}
          onToday={handleToday}
          view={view}
          onViewChange={handleViewChange}
          onMenuClick={toggleSidebar}
          compact={compact}
          isDarkMode={colorMode(mode, isDarkMode) === 'dark'}
          onThemeToggle={onThemeToggle}
          translations={t} // Pass translations
          hideViewSwitcher={hideViewSwitcher}
          language={language}
          onLanguageChange={onLanguageChange}
          locale={locale} // Pass locale
        />
        )}
        
        <div className="ck:flex ck:flex-1 ck:overflow-hidden">
            {layout !== 'focus' && !compact && (
            <div
                className="ck:overflow-hidden ck:transition-[width,opacity] ck:duration-300 ck:ease-[cubic-bezier(0.4,0,0.2,1)]"
                style={{ width: isSidebarOpen ? 256 : 0, opacity: isSidebarOpen ? 1 : 0 }}
            >
                {sidebarContent()}
            </div>
            )}

            <div className="ck:flex-1 ck:flex ck:flex-col ck:overflow-hidden ck:relative">
                {layout === 'focus' && isModalOpen && editorDirty && <div data-ck-guard className="ck:absolute ck:inset-0 ck:z-40" onClick={() => setCloseRequest((n) => n + 1)} />}
                {isLoading ? (
                    <div className="ck:flex-1 ck:overflow-auto ck:p-0 ck:md:p-4">
                      <div className="ck:h-full ck:min-w-full">
                        {view === 'month' && <MonthViewSkeleton />}
                        {view === 'week' && <WeekViewSkeleton />}
                        {view === 'day' && <DayViewSkeleton />}
                        {view === 'agenda' && <AgendaViewSkeleton />}
                        {view === 'resource' && <WeekViewSkeleton />}
                      </div>
                    </div>
                ) : (
                <div ref={swipeRef} className="ck:flex-1 ck:overflow-auto ck:p-0 ck:md:p-4 ck:touch-pan-y">
                  <div className="ck:h-full ck:min-w-full">
                        <div
                            key={`${view}-${periodKey}-${timezone || 'local'}`}
                            className="ck:h-full ck:animate-view-in"
                        >
                            {view === 'month' && (
                                <MonthView
                                currentDate={currentDate}
                                events={filteredEvents}
                                onEventClick={handleEventClickInternal}
                                onDateClick={handleDateClick}
                                timezone={timezone}
                                locale={locale}
                                translations={t}
                                onEventContextMenu={contextMenuHandler}
                                onDayEventResize={handleDayEventResize}
                                readonly={readOnly}
                                />
                            )}
                            {view === 'week' && (
                                <WeekView
                                currentDate={currentDate}
                                events={filteredEvents}
                                onEventClick={handleEventClickInternal}
                                onTimeSlotClick={slotClickHandler}
                                onTimeRangeSelect={rangeSelectHandler}
                                onEventResize={handleEventResize}
                                timezone={timezone}
                                locale={locale}
                                readonly={readOnly}
                                onEventContextMenu={contextMenuHandler}
                                onDayEventResize={handleDayEventResize}
                                onAllDaySlotClick={allDaySlotClickHandler}
                                onMoreClick={handleMoreClick}
                                draft={ghostDraft}
                                highlightId={landedId}
                                translations={t}
                                grid={grid}
                                />
                            )}
                            {view === 'day' && (
                                <DayView
                                    currentDate={currentDate}
                                    events={filteredEvents}
                                    onEventClick={handleEventClickInternal}
                                    onTimeSlotClick={slotClickHandler}
                                    onTimeRangeSelect={rangeSelectHandler}
                                    onEventResize={handleEventResize}
                                    timezone={timezone}
                                    locale={locale}
                                    readonly={readOnly}
                                    translations={t}
                                    onEventContextMenu={contextMenuHandler}
                                    onDayEventResize={handleDayEventResize}
                                    onAllDaySlotClick={allDaySlotClickHandler}
                                    onMoreClick={handleMoreClick}
                                    draft={ghostDraft}
                                    highlightId={landedId}
                                    grid={grid}
                                />
                            )}
                            {view === 'agenda' && (
                                <AgendaView
                                    currentDate={currentDate}
                                    events={filteredEvents}
                                    onEventClick={handleEventClickInternal}
                                    onCreateEvent={readOnly ? undefined : handleCreateEvent}
                                    locale={locale}
                                    translations={t}
                                    timezone={timezone}
                                    onEventContextMenu={contextMenuHandler}
                                />
                            )}
                            {view === 'resource' && resources && (
                                <ResourceView
                                    currentDate={currentDate}
                                    events={filteredEvents}
                                    resources={resources}
                                    onEventClick={handleEventClickInternal}
                                    onTimeSlotClick={slotClickHandler}
                                    locale={locale}
                                    timezone={timezone}
                                    translations={t}
                                    onEventContextMenu={contextMenuHandler}
                                    grid={grid}
                                />
                            )}
                        </div>
                  </div>
                </div>
                )}

                {/* Phone layout: a floating Create (Focus has one in its bar), none read-only (U3). */}
                {compact && layout === 'classic' && !readOnly && (
                <div className="ck:absolute ck:bottom-6 ck:right-6 ck:z-30">
                    <button
                        type="button"
                        onClick={handleCreateEvent}
                        aria-label={t.createEvent}
                        className="ck:w-14 ck:h-14 ck:bg-primary ck:rounded-full ck:shadow-lg ck:flex ck:items-center ck:justify-center ck:text-primary-foreground ck:active:scale-90 ck:transition-transform"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                    </button>
                </div>
                )}
            </div>
            {/* Focus: the editor docks here, beside the grid. */}
            {layout === 'focus' && !hasCustomForm && builtInEditor}
        </div>
        </>
        )}
        
        {compact && drawerOpen && layout !== 'focus' && <Drawer label={t.navigationLabel} closeLabel={t.close} onClose={closeDrawer}>{sidebarContent(closeDrawer)}</Drawer>}

        {hasCustomForm ? (
            (renderEventForm ?? ((props) => EventEditor && <EventEditor {...props} />))({
                isOpen: isModalOpen,
                onClose: handleModalClose,
                event: selectedEvent,
                initialDate: modalInitialDate,
                initialAllDay: modalInitialAllDay,
                onSave: handleModalSave,
                onDelete: handleModalDelete
            })
        ) : (
            layout !== 'focus' && builtInEditor
        )}

        {popoverEvent && editingId !== undefined && (
            <EventPopover
                event={popoverEvent}
                anchor={anchor.current.at}
                timezone={timezone}
                locale={locale}
                translations={t}
                onEdit={() => calendar.openEditor(editingId)}
                onDuplicate={() => calendar.duplicate(editingId)}
                onDelete={() => calendar.remove(editingId)}
                onClose={handleModalClose}
                docked={compact}
            />
        )}

        {quickDraft && (
            <QuickCreate
                draft={quickDraft}
                events={filteredEvents}
                calendars={calendars}
                timezone={timezone}
                locale={locale}
                translations={t}
                onChange={calendar.updateDraft}
                placeSearch={placeSearch}
                onSave={handleQuickSave}
                onMoreOptions={(extra) => {
                    setQuickExtra(extra);
                    calendar.openEditor();
                }}
                docked={compact}
                onClose={handleModalClose}
            />
        )}

        <UndoToast change={lastChange} onUndo={calendar.undo} translations={t} />

        <MoreEventsDialog
            events={moreEvents}
            onClose={handleModalClose}
            onEventClick={handleEventClickInternal}
            timezone={timezone}
            locale={locale}
            translations={t}
        />

        {/* Context Menu */}
        <EventContextMenu
          event={contextMenuEvent}
          position={contextMenuPosition}
          onClose={closeContextMenu}
          onEdit={(event) => {
            calendar.openEditor(event.id);
            closeContextMenu();
          }}
          onDelete={() => {
            if (contextMenuEvent) handleEventDelete(contextMenuEvent);
            closeContextMenu();
          }}
          onDuplicate={(event) => {
            handleEventDuplicate(event);
            closeContextMenu();
          }}
          translations={{
            edit: t.edit || t.editEvent || 'Edit',
            delete: t.delete || 'Delete',
            duplicate: t.duplicate || 'Duplicate',
          }}
        />

        <DragOverlay dropAnimation={null}>
            {activeDragEvent ? (
                <div
                    className="ck-event ck:relative ck:rounded-lg ck:drop-shadow-2xl ck:overflow-hidden ck:cursor-grabbing ck:transition-transform"
                    style={{
                        ...eventColorStyle(resolveEventColor(activeDragEvent, calendars)),
                        width: dragSize.width,
                        height: dragSize.height ? `${dragSize.height}px` : undefined,
                        transform: 'rotate(-2deg) scale(1.02)',
                    }}
                >
                    <div className="ck:p-2.5 ck:h-full ck:flex ck:flex-col">
                        <div>
                          <div className="ck:font-semibold ck:truncate ck:text-sm">{activeDragEvent.title}</div>
                          {(view === 'week' || view === 'day') && dragSize.height !== undefined && dragSize.height > 40 && (
                            <div className="ck:text-xs ck:opacity-80 ck:mt-0.5 ck:flex ck:items-center ck:gap-1">
                              <svg className="ck:w-3 ck:h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M12 6v6l4 2"/>
                              </svg>
                              {format(toDisplay(activeDragEvent.start, timezone), overlayTimeFormat, { locale })}{' - '}{format(toDisplay(activeDragEvent.end, timezone), overlayTimeFormat, { locale })}
                            </div>
                          )}
                        </div>

                        {/* Drag indicator */}
                        <div className="ck:absolute ck:bottom-1.5 ck:right-1.5 ck:opacity-60">
                          <svg className="ck:w-4 ck:h-4" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="9" cy="5" r="1.5"/>
                            <circle cx="15" cy="5" r="1.5"/>
                            <circle cx="9" cy="12" r="1.5"/>
                            <circle cx="15" cy="12" r="1.5"/>
                            <circle cx="9" cy="19" r="1.5"/>
                            <circle cx="15" cy="19" r="1.5"/>
                          </svg>
                        </div>
                    </div>
                </div>
            ) : null}
        </DragOverlay>

      </div>
    </CalendarDndContext>
    </EventLabelProvider>
    </EventColorProvider>
    </ComponentsProvider>
    </ClassNamesProvider>
  );
};
