import React, { useId, useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { DndContext, useSensor, useSensors, PointerSensor, Modifier, DragOverlay } from '@dnd-kit/core';
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
import { en, fr } from './locales';
import { cn } from './utils';
import { getThemeStyles } from './lib/theme';
import { uses24HourClock } from './lib/date';
import { useCalendarLogic } from './hooks/useCalendarLogic';
import { differenceInMinutes, format } from 'date-fns';
import { useViewSwipe } from './hooks/useSwipeGesture';

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

// Re-export utilities
export { cn } from './utils';

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
  onEventResize,
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
    handleViewChange,
    handleDateChange,
    handlePrev,
    handleNext,
    handleToday,
    handleDateClick,
    handleTimeSlotClick,
    handleEventClickInternal,
    handleCreateEvent,
    handleModalSave,
    handleModalDelete,
    handleDragEnd,
    expandedEvents // New export
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

  // Handle event resize
  const handleEventResize = (event: CalendarEvent, newEnd: Date) => {
    if (readOnly) return;

    // Call the external callback if provided
    if (onEventResize) {
      onEventResize(event, event.start, newEnd);
    }

    // Also update via onEventUpdate for internal state management
    if (onEventUpdate) {
      onEventUpdate({
        ...event,
        end: newEnd
      });
    }
  };
  
  const id = useId();

  // Mobile swipe gesture support
  const swipeRef = useViewSwipe<HTMLDivElement>(handlePrev, handleNext, true);

  // Base translations come from the built-in language packs (making the
  // `language` prop actually apply everywhere); the consumer's `translations`
  // prop overrides individual keys.
  const languagePack = language === 'fr' ? fr : en;

  const t = {
    ...languagePack,
    ...translations
  };

  // Drag ghost times follow the locale's clock convention.
  const overlayTimeFormat = uses24HourClock(locale) ? 'H:mm' : 'h:mm a';

  const handleDragStart = (event: any) => {
    const { active } = event;
    const draggedEvent = expandedEvents.find(e => e.id === active.id);
    if (draggedEvent) {
        setActiveDragEvent(draggedEvent);
    }
  };

  const onDragEndWrapper = (event: any) => {
      setActiveDragEvent(null);
      handleDragEnd(event);
  };
  
  // Calculate height for week/day view drag overlay
  const getDragHeight = () => {
      if (!activeDragEvent) return undefined;
      
      if (view === 'resource') {
        return 80; // Approximate height for resource view events
      }

      if (view !== 'week' && view !== 'day') return undefined;
      const duration = differenceInMinutes(activeDragEvent.end, activeDragEvent.start);
      // 60px per hour
      const height = (duration / 60) * 60; // 60px height base
      // If DayView uses 80px, we should account for that. 
      // Current implementation: WeekView = 60px, DayView = 80px.
      // But DayView uses 80px in DayView.tsx.
      // Let's assume 60px for now as default or pass a prop.
      // Or check view state.
      const hourHeight = view === 'day' ? 80 : 60;
      return (duration / 60) * hourHeight;
  };

  const getDragWidth = () => {
      if (view === 'month') return '100%';
      
      if (view === 'resource' && activeDragEvent) {
          const duration = differenceInMinutes(activeDragEvent.end, activeDragEvent.start);
          const width = (duration / 60) * 100; // 100px per hour in ResourceView
          return `${Math.max(width, 4)}px`;
      }

      // For Week/Day views, use a fixed width that looks like a column
      // Ideally we would measure the column width, but a fixed reasonable width works for the ghost
      return '150px'; 
  };

  // Filter events based on active calendars
  const filteredEvents = useMemo(() => {
      if (!calendars) return expandedEvents;
      const activeCalendarIds = calendars.filter(c => c.active !== false).map(c => c.id);
      return expandedEvents.filter(e => {
          // If event has no calendarId, show it by default OR hide it? 
          // Usually events belong to a calendar. If undefined, maybe show it.
          if (!e.calendarId) return true; 
          return activeCalendarIds.includes(e.calendarId);
      });
  }, [expandedEvents, calendars]);

  return (
    <DndContext 
        id={id} 
        sensors={dndSensors} 
        onDragStart={handleDragStart}
        onDragEnd={onDragEndWrapper} 
        modifiers={modifiers}
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
                            key={`${view}-${currentDate.toISOString()}-${timezone || 'local'}`}
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
                                />
                            )}
                            {view === 'week' && (
                                <WeekView
                                currentDate={currentDate}
                                events={filteredEvents}
                                onEventClick={handleEventClickInternal}
                                onTimeSlotClick={handleTimeSlotClick}
                                onEventResize={handleEventResize}
                                timezone={timezone}
                                locale={locale}
                                readonly={readOnly}
                                />
                            )}
                            {view === 'day' && (
                                <DayView
                                    currentDate={currentDate}
                                    events={filteredEvents}
                                    onEventClick={handleEventClickInternal}
                                    onTimeSlotClick={handleTimeSlotClick}
                                    onEventResize={handleEventResize}
                                    timezone={timezone}
                                    locale={locale}
                                    readonly={readOnly}
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
                                />
                            )}
                            {view === 'resource' && resources && (
                                <ResourceView
                                    currentDate={currentDate}
                                    events={filteredEvents}
                                    resources={resources}
                                    onEventClick={handleEventClickInternal}
                                    onTimeSlotClick={(date, resourceId) => {
                                        // Handle resource time slot click
                                        // Ideally useCalendarLogic should support resourceId in handleTimeSlotClick
                                        // For now, we can manually trigger the modal
                                        if (readOnly) return;
                                        // Hack: we might need to update useCalendarLogic to accept resourceId
                                        handleTimeSlotClick(date); 
                                    }}
                                    locale={locale}
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
                )}

                {/* Mobile Create Button (FAB) */}
                <div className="md:hidden absolute bottom-6 right-6 z-50">
                    <button 
                        onClick={handleCreateEvent}
                        className="w-14 h-14 bg-blue-600 rounded-full shadow-lg flex items-center justify-center text-white active:scale-90 transition-transform"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                    </button>
                </div>
            </div>
        </div>
        
        {renderEventForm ? (
            renderEventForm({
                isOpen: isModalOpen,
                onClose: () => setIsModalOpen(false),
                event: selectedEvent,
                initialDate: modalInitialDate,
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
                translations={t} // Pass translations
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
          onDelete={(eventId) => {
            onEventDelete?.(eventId);
            closeContextMenu();
          }}
          onDuplicate={(event) => {
            // Create a duplicate with a new ID and slightly shifted time
            const duplicatedEvent: Partial<CalendarEvent> = {
              ...event,
              id: `${event.id}-copy-${Date.now()}`,
              title: `${event.title} (Copy)`,
              start: new Date(event.start.getTime() + 24 * 60 * 60 * 1000), // +1 day
              end: new Date(event.end.getTime() + 24 * 60 * 60 * 1000),
            };
            onEventCreate?.(duplicatedEvent);
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
                        width: getDragWidth(),
                        height: getDragHeight() ? `${getDragHeight()}px` : undefined,
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
                          {(view === 'week' || view === 'day') && getDragHeight() && getDragHeight()! > 40 && (
                            <div className="text-xs opacity-80 mt-0.5 flex items-center gap-1">
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M12 6v6l4 2"/>
                              </svg>
                              {format(activeDragEvent.start, overlayTimeFormat, { locale })} - {format(activeDragEvent.end, overlayTimeFormat, { locale })}
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
