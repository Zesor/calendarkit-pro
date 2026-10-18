import React, { useCallback, useId, useState, useMemo } from 'react';
import { DndContext, useSensor, useSensors, PointerSensor, Modifier, DragOverlay, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
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
import { cn } from './utils';
import { getThemeStyles } from './lib/theme';
import { resolveTranslations, timeFormats } from './core/format';
import { toDisplay } from './core/timezone';
import { resolveWeekStartsOn } from './core/week';
import { useCalendarLogic } from './hooks/useCalendarLogic';
import { format, startOfWeek } from 'date-fns';
import { useViewSwipe } from './hooks/useSwipeGesture';
import { dayAwareCollision, dragOverlaySize } from './components/dnd/dragOverlay';

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
} from './types';

// Re-export utilities (`cn` is deprecated, removed in 2.0)
export { deprecatedCn as cn } from './utils';

export const Scheduler: React.FC<CalendarProps> = ({
  events = [],
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
  locale // Date-fns locale
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

  const {
    view,
    currentDate,
    isSidebarOpen,
    setIsSidebarOpen,
    isModalOpen,
    setIsModalOpen,
    selectedEvent,
    modalInitialDate,
    modalInitialAllDay,
    handleViewChange,
    handleDateChange,
    handlePrev,
    handleNext,
    handleToday,
    handleDateClick,
    handleTimeSlotClick,
    handleAllDaySlotClick,
    handleEventClickInternal,
    handleCreateEvent,
    handleModalSave,
    handleModalDelete,
    handleEventDelete,
    handleEventDuplicate,
    handleEventResize,
    handleDayEventResize,
    handleDragEnd,
    expandedEvents
  } = useCalendarLogic({
    events,
    view: controlledView,
    onViewChange: controlledOnViewChange,
    date: controlledDate,
    onDateChange: controlledOnDateChange,
    onEventClick,
    onEventUpdate,
    onEventCreate,
    onEventDelete,
    onEventDrop,
    onEventResize,
    onOccurrenceDelete,
    readOnly,
    timezone
  });

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const gridSize = 15; // 15px snap (15 minutes if 60px/hr)
  const snapToGrid = createSnapModifier(gridSize);
  const modifiers: Modifier[] = [snapToGrid, restrictToWindowEdges];

  // Disable DnD if readOnly
  const dndSensors = readOnly ? [] : sensors;

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

  const onDragEndWrapper = useCallback((event: DragEndEvent) => {
      setActiveDragEvent(null);
      handleDragEnd(event);
  }, [handleDragEnd]);
  
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
    <DndContext 
        id={id} 
        sensors={dndSensors} 
        onDragStart={handleDragStart}
        onDragEnd={onDragEndWrapper} 
        modifiers={modifiers}
        collisionDetection={dayAwareCollision}
    >
      <div
        className={cn("flex flex-col h-full bg-background text-foreground relative", className)}
        style={getThemeStyles(theme)}
      >
        <CalendarHeader
          currentDate={currentDate}
          onPrev={handlePrev}
          onNext={handleNext}
          onToday={handleToday}
          view={view}
          onViewChange={handleViewChange}
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          isDarkMode={isDarkMode}
          onThemeToggle={onThemeToggle}
          translations={t} // Pass translations
          hideViewSwitcher={hideViewSwitcher}
          language={language}
          onLanguageChange={onLanguageChange}
          locale={locale} // Pass locale
        />
        
        <div className="flex flex-1 overflow-hidden">
            <motion.div
                className={cn(
                  "hidden md:block overflow-hidden",
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
                    className="w-full h-full"
                    readOnly={readOnly}
                    calendars={calendars}
                    onCalendarToggle={onCalendarToggle}
                    translations={t}
                    locale={locale}
                />
            </motion.div>

            <div className="flex-1 flex flex-col overflow-hidden relative">
                {isLoading ? (
                    <div className="flex-1 overflow-auto p-0 md:p-4">
                      <div className="h-full min-w-full">
                        {view === 'month' && <MonthViewSkeleton />}
                        {view === 'week' && <WeekViewSkeleton />}
                        {view === 'day' && <DayViewSkeleton />}
                        {view === 'agenda' && <AgendaViewSkeleton />}
                        {view === 'resource' && <WeekViewSkeleton />}
                      </div>
                    </div>
                ) : (
                <div ref={swipeRef} className="flex-1 overflow-auto p-0 md:p-4 touch-pan-y">
                  <div className="h-full min-w-full">
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
                            className="h-full"
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
                <div className="md:hidden absolute bottom-6 right-6 z-50">
                    <button
                        onClick={handleCreateEvent}
                        aria-label={t.createEvent}
                        className="w-14 h-14 bg-blue-600 rounded-full shadow-lg flex items-center justify-center text-white active:scale-90 transition-transform"
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
                onClose: () => setIsModalOpen(false),
                event: selectedEvent,
                initialDate: modalInitialDate,
                initialAllDay: modalInitialAllDay,
                onSave: handleModalSave,
                onDelete: handleModalDelete
            })
        ) : (
            <EventModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
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
                    className={cn(
                      "rounded-lg shadow-2xl border-2 overflow-hidden cursor-grabbing transition-transform",
                      "backdrop-blur-sm",
                      !activeDragEvent.color && "bg-primary/90 border-primary/60 text-primary-foreground",
                    )}
                    style={{
                        backgroundColor: activeDragEvent.color ? `${activeDragEvent.color}e0` : undefined,
                        borderColor: activeDragEvent.color ? `${activeDragEvent.color}80` : undefined,
                        color: activeDragEvent.color ? '#fff' : undefined,
                        width: dragSize.width,
                        height: dragSize.height ? `${dragSize.height}px` : undefined,
                        boxShadow: `0 20px 40px -15px ${activeDragEvent.color || 'var(--primary)'}40, 0 10px 20px -10px rgba(0,0,0,0.2)`,
                        transform: 'rotate(-2deg) scale(1.02)',
                    }}
                >
                    <div className="p-2.5 h-full flex flex-col">
                        {/* Event color accent bar */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
                          style={{ backgroundColor: activeDragEvent.color || 'var(--primary)' }}
                        />

                        {/* Content */}
                        <div className="pl-2">
                          <div className="font-semibold truncate text-sm">{activeDragEvent.title}</div>
                          {(view === 'week' || view === 'day') && dragSize.height !== undefined && dragSize.height > 40 && (
                            <div className="text-xs opacity-80 mt-0.5 flex items-center gap-1">
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M12 6v6l4 2"/>
                              </svg>
                              {format(toDisplay(activeDragEvent.start, timezone), overlayTimeFormat, { locale })}{' - '}{format(toDisplay(activeDragEvent.end, timezone), overlayTimeFormat, { locale })}
                            </div>
                          )}
                        </div>

                        {/* Drag indicator */}
                        <div className="absolute bottom-1.5 right-1.5 opacity-60">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
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
    </DndContext>
  );
};
