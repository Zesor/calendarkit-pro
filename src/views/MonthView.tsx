import React, { useMemo } from 'react';
import { format, isSameDay, isSameMonth, Locale } from 'date-fns';
import { CalendarEvent } from '../types';
import { cn } from '../utils';
import { eventsByStartDay } from '../core/events';
import { displayToday } from '../core/timezone';
import { getMonthGrid, getWeekDays, resolveWeekStartsOn } from '../core/week';
import { DraggableEvent } from '../components/dnd/DraggableEvent';
import { DroppableCell } from '../components/dnd/DroppableCell';

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
  timezone?: string;
  locale?: Locale;
}

// Memoized Event Item Component for performance
const EventItem = React.memo(({ event, onEventClick }: { event: CalendarEvent, onEventClick?: (e: CalendarEvent) => void }) => (
    <DraggableEvent event={event}>
        <div
            className={cn(
              "text-xs px-2.5 py-1.5 rounded-lg truncate cursor-pointer shadow-sm transition-all duration-200",
              "hover:shadow-md hover:scale-[1.02] hover:z-10",
              !event.color && "bg-primary/10 text-primary hover:bg-primary/15 border-[0.5px] border-primary/20"
            )}
            style={event.color ? {
              backgroundColor: `${event.color}20`,
              color: event.color,
              borderLeft: `3px solid ${event.color}`,
            } : undefined}
            onClick={(e) => {
              e.stopPropagation();
              onEventClick?.(event);
            }}
        >
            <span className="font-medium">{event.title}</span>
        </div>
    </DraggableEvent>
));

EventItem.displayName = 'EventItem';

export const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  events,
  onEventClick,
  onDateClick,
  timezone,
  locale
}) => {
  // Week start follows the locale (historical Monday fallback). The same value drives the grid
  // AND the weekday header row.
  const weekStartsOn = resolveWeekStartsOn(locale, 1);
  const days = useMemo(() => getMonthGrid(currentDate, weekStartsOn), [currentDate, weekStartsOn]);
  const weekDays = useMemo(() => getWeekDays(currentDate, weekStartsOn), [currentDate, weekStartsOn]);

  // O(1) bucket lookup per cell, computed once per (events, zone) and cached (C2).
  const eventsByDay = eventsByStartDay(events, timezone);
  const today = displayToday(timezone);

  return (
    <div className="flex flex-col h-full bg-background border-[0.5px] scrollbar-hide border-border/50 rounded-2xl overflow-hidden min-w-[800px] md:min-w-0 shadow-sm">
      <div className="overflow-y-auto flex-1 relative">
        {/* Sticky Header */}
        <div className="grid grid-cols-7 border-b-[0.5px] border-border/50 bg-gradient-to-r from-muted/30 via-muted/40 to-muted/30 sticky top-0 z-20 backdrop-blur-sm">
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className="py-3 text-center text-xs font-semibold text-muted-foreground border-r-[0.5px] border-border/30 last:border-r-0 uppercase tracking-wider"
            >
              {format(day, 'EEE', { locale })}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7" style={{ gridAutoRows: '130px' }}>
        {days.map((day) => {
          const dayKey = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDay.get(dayKey) || [];

          const isCurrentMonth = isSameMonth(day, currentDate);
          const cellId = day.toISOString();

          return (
            <DroppableCell
              key={cellId}
              id={cellId}
              date={day}
              className={cn(
                "h-[130px] p-2 border-b-[0.5px] border-r-[0.5px] border-border/30 last:border-r-0 relative transition-all duration-200 hover:bg-accent/5 flex flex-col gap-1.5 overflow-hidden group",
                !isCurrentMonth && "bg-muted/5 text-muted-foreground/60",
                isSameDay(day, today) && "bg-primary/5 ring-1 ring-inset ring-primary/20"
              )}
              onClick={() => onDateClick?.(day)}
            >
              <div className="flex justify-between items-start">
                <div className={cn(
                  "text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full transition-all duration-200",
                  isSameDay(day, today)
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                    : "group-hover:bg-accent"
                )}>
                  {format(day, 'd', { locale })}
                </div>
                {dayEvents.length > 0 && (
                  <div className="text-[10px] font-medium text-muted-foreground/60 bg-muted/50 px-1.5 py-0.5 rounded-full">
                    {dayEvents.length}
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col gap-1 scrollbar-hide overflow-y-auto overflow-x-hidden">
                {dayEvents.slice(0, 4).map(event => (
                   <EventItem key={`${event.id}-${dayKey}`} event={event} onEventClick={onEventClick} />
                ))}
                {dayEvents.length > 4 && (
                    <div className="text-[10px] text-primary font-semibold text-center py-1 px-2 rounded-md bg-primary/5 hover:bg-primary/10 cursor-pointer transition-colors">
                        +{dayEvents.length - 4} more
                    </div>
                )}
              </div>
            </DroppableCell>
          );
        })}
        </div>
      </div>
    </div>
  );
};
