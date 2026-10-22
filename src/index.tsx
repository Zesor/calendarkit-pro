import React, { useCallback, useId, useState, useMemo, useRef } from 'react';
import { Modifier, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { CalendarHeader } from './components/CalendarHeader';
import { Sidebar } from './components/Sidebar';
import { MonthView } from './views/MonthView';
import { WeekView } from './views/WeekView';
import { DayView } from './views/DayView';
import { AgendaView } from './views/AgendaView';
import { ResourceView } from './views/ResourceView';
import { EventModal } from './components/EventModal';
import { MoreEventsDialog } from './components/MoreEventsDialog';
import { QuickCreate } from './components/QuickCreate';
import { EventPopover } from './components/EventPopover';
import { UndoToast } from './components/UndoToast';
import { MonthViewSkeleton, WeekViewSkeleton, DayViewSkeleton, AgendaViewSkeleton } from './components/Skeleton';
import { EventContextMenu, useEventContextMenu } from './components/ContextMenu';
import { CalendarProps, CalendarEvent, CalendarClassNames, CalendarComponents } from './types';
import { cx } from './utils';
import { colorMode, getThemeStyles, themePreset } from './lib/theme';
import { resolveTranslations, timeFormats } from './core/format';
import { toDisplay } from './core/timezone';
import { resolveWeekStartsOn } from './core/week';
import { useCalendar, useCalendarSelector } from './react/useCalendar';
import { CalendarDndContext } from './react/dnd';
import { useStableCallback } from './hooks/useStableCallback';
import { format, startOfWeek } from 'date-fns';
import { useViewSwipe } from './hooks/useSwipeGesture';
import { dragOverlaySize } from './components/dnd/dragOverlay';
import { restrictToWindowEdges, snapToGrid } from './components/dnd/modifiers';
import { CalendarStyles, useMissingStylesWarning } from './styles/CalendarStyles';
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
} from './types';

const NO_CLASSES: CalendarClassNames = {};
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
  dayStartHour,
  dayEndHour,
  slotDuration,
  reverseTimeAxis,
  workingHours,
  scrollToHour,
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
  // The event just created or moved gets a brief outline (spec §8.6).
  const [landedId, setLandedId] = useState<string>();
  React.useEffect(() => {
    if (!lastChange || lastChange.kind === 'delete') return setLandedId(undefined);
    setLandedId(lastChange.eventId);
    const timer = setTimeout(() => setLandedId(undefined), 1600);
    return () => clearTimeout(timer);
  }, [lastChange]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // The 1.x modal reads the dialog: an event being shown or edited, or a new event at a slot.
  const editingId = dialog?.kind === 'event' || dialog?.kind === 'editor' ? dialog.eventId : undefined;
  // Like 1.x, the form gets a snapshot of the event taken when it opened: new event objects from the
  // parent (a refetch) do not reset what the user is typing, and the last event stays available
  // after the form closes (exit animations, a save that comes after onClose).
  const lastOpened = useRef<{ id?: string; event: CalendarEvent | null }>({ event: null });
  // Where the last pointer press was: the event card opens next to it, and keeps that place while open.
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const anchor = useRef<{ dialog: unknown; at: { x: number; y: number } | null }>({ dialog: null, at: null });
  if (dialog?.kind === 'event' && anchor.current.dialog !== dialog) anchor.current = { dialog, at: pointer.current };
  const rootRef = useRef<HTMLDivElement>(null);
  useMissingStylesWarning(rootRef, injectStyles);
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
  const modalInitialValues = useMemo(() => {
    if (editingId !== undefined || !draft) return undefined;
    return { title: draft.savedTitle, end: draft.end, ...(draft.calendarId ? { calendarId: draft.calendarId } : {}) };
  }, [editingId, draft]);

  // Stable handlers (the store's actions never change identity).
  const { EventEditor, Toolbar, Sidebar: CustomSidebar } = components;
  const hasCustomForm = !!(renderEventForm || EventEditor);
  // Classic: a click on an event opens the popover; the editor opens from its Edit (a 1.x custom form
  // still opens on the click).
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
    handleAllDaySlotClick: (day: Date) => calendar.openSlot(day, { allDay: true, editor: hasCustomForm }),
    handleCreateEvent: () => calendar.openSlot(new Date(), { editor: true }),
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
    handleAllDaySlotClick, handleCreateEvent, handleModalSave, handleModalDelete, handleModalClose, handleEventDelete,
    handleEventDuplicate, handleEventResize, handleDayEventResize, handleMoreClick,
  } = handlers;
  // 1.x: a click calls onEventClick, then opens the event unless readOnly.
  const handleEventClickInternal = useStableCallback((event: CalendarEvent) => {
    onEventClick?.(event);
    if (!readOnly) calendar.openEvent(event.id);
  });

  const id = useId();

  // Mobile swipe gesture support
  const swipeRef = useViewSwipe<HTMLDivElement>(handlePrev, handleNext, true);

  // Built-in language pack + the consumer's overrides, memoized so children keep stable props (C6).
  const t = useMemo(() => resolveTranslations(language, translations), [language, translations]);

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

  const slotClickHandler = readOnly ? undefined : handleTimeSlotClick;
  const allDaySlotClickHandler = readOnly ? undefined : handleAllDaySlotClick;
  const contextMenuHandler = readOnly ? undefined : openContextMenu;

  return (
    <ClassNamesProvider value={classNames}>
    <ComponentsProvider value={components}>
    <EventColorProvider value={calendars}>
    <CalendarDndContext
        calendar={calendar}
        id={id}
        onDragStart={handleDragStart}
        onDragEnd={onDragEndWrapper}
        modifiers={modifiers}
    >
      <div
        ref={rootRef}
        onPointerDownCapture={(e) => { pointer.current = { x: e.clientX, y: e.clientY }; }}
        className={cx("ck-root ck:flex ck:flex-col ck:h-full ck:bg-background ck:text-foreground ck:relative", className, classNames.root)}
        style={getThemeStyles(theme)}
        data-ck-theme={themePreset(theme)}
        data-ck-mode={colorMode(mode, isDarkMode)}
      >
        {injectStyles && <CalendarStyles />}
        {Toolbar ? (
          <Toolbar
            date={currentDate}
            view={view}
            onPrev={handlePrev}
            onNext={handleNext}
            onToday={handleToday}
            onViewChange={handleViewChange}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          />
        ) : (
        <CalendarHeader
          currentDate={currentDate}
          onPrev={handlePrev}
          onNext={handleNext}
          onToday={handleToday}
          view={view}
          onViewChange={handleViewChange}
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
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
            <div
                className="ck:hidden ck:md:block ck:overflow-hidden ck:transition-[width,opacity] ck:duration-300 ck:ease-[cubic-bezier(0.4,0,0.2,1)]"
                style={{ width: isSidebarOpen ? 256 : 0, opacity: isSidebarOpen ? 1 : 0 }}
            >
                {CustomSidebar ? (
                  <CustomSidebar
                    date={currentDate}
                    onDateChange={handleDateChange}
                    onCreate={readOnly ? undefined : handleCreateEvent}
                    calendars={calendars}
                    onCalendarToggle={onCalendarToggle}
                  />
                ) : (
                <Sidebar
                    currentDate={currentDate}
                    onDateChange={handleDateChange}
                    onViewChange={handleViewChange}
                    onEventCreate={handleCreateEvent}
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
            </div>

            <div className="ck:flex-1 ck:flex ck:flex-col ck:overflow-hidden ck:relative">
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
                                onEventResize={handleEventResize}
                                timezone={timezone}
                                locale={locale}
                                readonly={readOnly}
                                onEventContextMenu={contextMenuHandler}
                                onDayEventResize={handleDayEventResize}
                                onAllDaySlotClick={allDaySlotClickHandler}
                                onMoreClick={handleMoreClick}
                                draft={quickDraft}
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
                                    onEventResize={handleEventResize}
                                    timezone={timezone}
                                    locale={locale}
                                    readonly={readOnly}
                                    translations={t}
                                    onEventContextMenu={contextMenuHandler}
                                    onDayEventResize={handleDayEventResize}
                                    onAllDaySlotClick={allDaySlotClickHandler}
                                    onMoreClick={handleMoreClick}
                                    draft={quickDraft}
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

                {/* Mobile Create Button (FAB), hidden in read-only mode (U3) */}
                {!readOnly && (
                <div className="ck:md:hidden ck:absolute ck:bottom-6 ck:right-6 ck:z-50">
                    <button
                        onClick={handleCreateEvent}
                        aria-label={t.createEvent}
                        className="ck:w-14 ck:h-14 ck:bg-primary ck:rounded-full ck:shadow-lg ck:flex ck:items-center ck:justify-center ck:text-primary-foreground ck:active:scale-90 ck:transition-transform"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                    </button>
                </div>
                )}
            </div>
        </div>
        
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
            <EventModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                event={selectedEvent}
                initialDate={modalInitialDate}
                onSave={handleModalSave}
                onDelete={handleModalDelete}
                calendars={calendars}
                eventTypes={eventTypes}
                translations={t}
                initialAllDay={modalInitialAllDay}
                initialValues={modalInitialValues}
            />
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
                onSave={calendar.saveDraft}
                onMoreOptions={() => calendar.openEditor()}
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
    </EventColorProvider>
    </ComponentsProvider>
    </ClassNamesProvider>
  );
};
