import React, { useCallback, useId, useState, useMemo, useRef } from 'react';
import { Modifier, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { createSnapModifier, restrictToWindowEdges } from '@dnd-kit/modifiers';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarHeader } from './components/CalendarHeader';
import { Sidebar } from './components/Sidebar';
import { MonthView } from './views/MonthView';
import { WeekView } from './views/WeekView';
import { DayView } from './views/DayView';
import { AgendaView } from './views/AgendaView';
import { ResourceView } from './views/ResourceView';
import { EventModal } from './components/EventModal';
import { MonthViewSkeleton, WeekViewSkeleton, DayViewSkeleton, AgendaViewSkeleton } from './components/Skeleton';
import { EventContextMenu, useEventContextMenu } from './components/ContextMenu';
import { CalendarProps, CalendarEvent } from './types';
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
import { CalendarStyles, useMissingStylesWarning } from './styles/CalendarStyles';

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
} from './types';

// A stable default: a new `[]` on every render would look like new events to the engine.
const NO_EVENTS: CalendarEvent[] = [];

export const Scheduler: React.FC<CalendarProps> = ({
  events = NO_EVENTS,
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
    stripGeneratedIds: true,
  });
  const view = useCalendarSelector(calendar, (s) => s.view);
  const currentDate = useCalendarSelector(calendar, (s) => s.date);
  const expandedEvents = useCalendarSelector(calendar, (s) => s.occurrences);
  const dialog = useCalendarSelector(calendar, (s) => s.dialog);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // The 1.x modal reads the dialog: an event being shown or edited, or a new event at a slot.
  const editingId = dialog?.kind === 'event' || dialog?.kind === 'editor' ? dialog.eventId : undefined;
  // Like 1.x, the form gets a snapshot of the event taken when it opened: new event objects from the
  // parent (a refetch) do not reset what the user is typing, and the last event stays available
  // after the form closes (exit animations, a save that comes after onClose).
  const lastOpened = useRef<{ id?: string; event: CalendarEvent | null }>({ event: null });
  const rootRef = useRef<HTMLDivElement>(null);
  useMissingStylesWarning(rootRef, injectStyles);
  if (dialog && dialog.kind !== 'more') {
    if (editingId === undefined) lastOpened.current = { event: null };
    else if (lastOpened.current.id !== editingId) lastOpened.current = { id: editingId, event: expandedEvents.find((e) => e.id === editingId) ?? null };
  }
  const selectedEvent = lastOpened.current.event;
  const draft = dialog?.kind === 'quick' || dialog?.kind === 'editor' ? dialog.draft : undefined;
  const isModalOpen = dialog !== null && dialog.kind !== 'more';
  const modalInitialDate = editingId === undefined ? draft?.start : undefined;
  const modalInitialAllDay = editingId === undefined && !!draft?.allDay;

  // Stable handlers (the store's actions never change identity).
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
    handleTimeSlotClick: (date: Date, resourceId?: string) => calendar.openSlot(date, { resourceId, editor: true }),
    handleAllDaySlotClick: (day: Date) => calendar.openSlot(day, { allDay: true, editor: true }),
    handleCreateEvent: () => calendar.openSlot(new Date(), { editor: true }),
    handleModalSave: (data: Partial<CalendarEvent>) => calendar.saveEvent(data, { eventId: lastOpened.current.id ?? null }),
    handleModalDelete: (eventId: string) => calendar.remove(eventId),
    handleModalClose: () => calendar.closeDialog(),
    handleEventDelete: (event: CalendarEvent) => calendar.remove(event.id),
    handleEventDuplicate: (event: CalendarEvent) => calendar.duplicate(event.id),
    handleEventResize: (event: CalendarEvent, newEnd: Date) => calendar.resize(event.id, newEnd),
    handleDayEventResize: (event: CalendarEvent, newLastDay: Date) => calendar.resizeDays(event.id, newLastDay),
  }), [calendar]);
  const {
    handleViewChange, handleDateChange, handlePrev, handleNext, handleToday, handleDateClick, handleTimeSlotClick,
    handleAllDaySlotClick, handleCreateEvent, handleModalSave, handleModalDelete, handleModalClose, handleEventDelete,
    handleEventDuplicate, handleEventResize, handleDayEventResize,
  } = handlers;
  // 1.x: a click calls onEventClick, then opens the event unless readOnly.
  const handleEventClickInternal = useStableCallback((event: CalendarEvent) => {
    onEventClick?.(event);
    if (!readOnly) calendar.openEvent(event.id);
  });

  const gridSize = 15; // 15px snap (15 minutes if 60px/hr)
  const snapToGrid = createSnapModifier(gridSize);
  const modifiers: Modifier[] = [snapToGrid, restrictToWindowEdges];

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

  const slotClickHandler = readOnly ? undefined : handleTimeSlotClick;
  const allDaySlotClickHandler = readOnly ? undefined : handleAllDaySlotClick;
  const contextMenuHandler = readOnly ? undefined : openContextMenu;

  return (
    <CalendarDndContext
        calendar={calendar}
        id={id}
        onDragStart={handleDragStart}
        onDragEnd={onDragEndWrapper}
        modifiers={modifiers}
    >
      <div
        ref={rootRef}
        className={cx("ck-root ck:flex ck:flex-col ck:h-full ck:bg-background ck:text-foreground ck:relative", className)}
        style={getThemeStyles(theme)}
        data-ck-theme={themePreset(theme)}
        data-ck-mode={colorMode(mode, isDarkMode)}
      >
        {injectStyles && <CalendarStyles />}
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
        
        <div className="ck:flex ck:flex-1 ck:overflow-hidden">
            <motion.div
                className={cx(
                  "ck:hidden ck:md:block ck:overflow-hidden",
                )}
                initial={false}
                animate={{
                  width: isSidebarOpen ? 256 : 0,
                  opacity: isSidebarOpen ? 1 : 0,
                }}
                transition={{
                  duration: 0.3,
                  ease: [0.4, 0, 0.2, 1],
                }}
            >
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
            </motion.div>

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
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                            key={`${view}-${periodKey}-${timezone || 'local'}`}
                            initial={{ opacity: 0, scale: 0.98, y: 15 }}
                            animate={{
                              opacity: 1,
                              scale: 1,
                              y: 0,
                              transition: {
                                duration: 0.25,
                                ease: [0.25, 0.1, 0.25, 1],
                              }
                            }}
                            exit={{
                              opacity: 0,
                              scale: 0.98,
                              y: -10,
                              transition: {
                                duration: 0.15,
                                ease: [0.25, 0.1, 0.25, 1],
                              }
                            }}
                            className="ck:h-full"
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
                                translations={t}
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
                                />
                            )}
                            {view === 'agenda' && (
                                <AgendaView
                                    currentDate={currentDate}
                                    events={filteredEvents}
                                    onEventClick={handleEventClickInternal}
                                    onCreateEvent={handleCreateEvent}
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
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
                )}

                {/* Mobile Create Button (FAB), hidden in read-only mode (U3) */}
                {!readOnly && (
                <div className="ck:md:hidden ck:absolute ck:bottom-6 ck:right-6 ck:z-50">
                    <button
                        onClick={handleCreateEvent}
                        aria-label={t.createEvent}
                        className="ck:w-14 ck:h-14 ck:bg-blue-600 ck:rounded-full ck:shadow-lg ck:flex ck:items-center ck:justify-center ck:text-white ck:active:scale-90 ck:transition-transform"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                    </button>
                </div>
                )}
            </div>
        </div>
        
        {renderEventForm ? (
            renderEventForm({
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
                locale={locale}
                initialAllDay={modalInitialAllDay}
            />
        )}

        {/* Context Menu */}
        <EventContextMenu
          event={contextMenuEvent}
          position={contextMenuPosition}
          onClose={closeContextMenu}
          onEdit={(event) => {
            handleEventClickInternal(event);
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
                    className={cx(
                      "ck:rounded-lg ck:shadow-2xl ck:border-2 ck:overflow-hidden ck:cursor-grabbing ck:transition-transform",
                      "ck:backdrop-blur-xs",
                      !activeDragEvent.color && "ck:bg-primary/90 ck:border-primary/60 ck:text-primary-foreground",
                    )}
                    style={{
                        backgroundColor: activeDragEvent.color ? `${activeDragEvent.color}e0` : undefined,
                        borderColor: activeDragEvent.color ? `${activeDragEvent.color}80` : undefined,
                        color: activeDragEvent.color ? '#fff' : undefined,
                        width: dragSize.width,
                        height: dragSize.height ? `${dragSize.height}px` : undefined,
                        boxShadow: `0 20px 40px -15px ${activeDragEvent.color || 'var(--ck-primary)'}40, 0 10px 20px -10px rgba(0,0,0,0.2)`,
                        transform: 'rotate(-2deg) scale(1.02)',
                    }}
                >
                    <div className="ck:p-2.5 ck:h-full ck:flex ck:flex-col">
                        {/* Event color accent bar */}
                        <div
                          className="ck:absolute ck:left-0 ck:top-0 ck:bottom-0 ck:w-1 ck:rounded-l-lg"
                          style={{ backgroundColor: activeDragEvent.color || 'var(--ck-primary)' }}
                        />

                        {/* Content */}
                        <div className="ck:pl-2">
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
  );
};
