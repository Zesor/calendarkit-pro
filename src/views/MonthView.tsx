import React, { useMemo } from 'react';
import { format, isSameDay, isSameMonth, Locale } from 'date-fns';
import { CalendarEvent, CalendarTranslations } from '../types';
import { interpolate } from '../core/format';
import { cn } from '../utils';
import { eventsByStartDay } from '../core/events';
import { layoutDayRow, partitionDayEvents } from '../core/allDay';
import { AllDayBar } from '../components/AllDayBar';
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
  translations?: Partial<CalendarTranslations>;
  onEventContextMenu?: (event: CalendarEvent, e: React.MouseEvent) => void;
  onDayEventResize?: (event: CalendarEvent, newLastDay: Date) => void;
  readonly?: boolean;
}

interface EventItemProps {
  event: CalendarEvent;
  onEventClick?: (e: CalendarEvent) => void;
  onEventContextMenu?: (event: CalendarEvent, e: React.MouseEvent) => void;
}

// Memoized Event Item Component for performance
const EventItem = React.memo(({ event, onEventClick, onEventContextMenu }: EventItemProps) => (
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
            onContextMenu={onEventContextMenu ? (e) => onEventContextMenu(event, e) : undefined}
        >
            <span className="font-medium">{event.title}</span>
        </div>
    </DraggableEvent>
));

EventItem.displayName = 'EventItem';

const ROW_HEIGHT = 130; // px per week row (unchanged)
const LANE_HEIGHT = 20;
const MAX_LANES = 3; // all-day lanes shown per week before "+N more"
const MAX_ITEMS = 4; // timed events shown per cell when the week has no bars (historical)
const BARS_TOP = 38; // below the day number
const CELL_CHROME = 16 + 28 + 6; // cell padding, day number, gap
const ITEM_STEP = 29 + 4; // timed chip + gap
const MORE_HEIGHT = 20; // "+N more" link

// Timed chips that fit under the bars without being clipped. Weeks without bars keep the
// historical 4 chips.
function timedSlots(visibleLanes: number, timedCount: number, hiddenBars: number): number {
  if (visibleLanes === 0) return Math.min(timedCount, MAX_ITEMS);
  const room = ROW_HEIGHT - CELL_CHROME - visibleLanes * LANE_HEIGHT;
  if (hiddenBars === 0 && timedCount * ITEM_STEP - 4 <= room) return timedCount;
  return Math.max(0, Math.floor((room - MORE_HEIGHT) / ITEM_STEP));
}

export const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  events,
  onEventClick,
  onDateClick,
  timezone,
  locale,
  translations,
  onEventContextMenu,
  onDayEventResize,
  readonly
}) => {
  // Week start follows the locale (historical Monday fallback). The same value drives the grid
  // AND the weekday header row.
  const weekStartsOn = resolveWeekStartsOn(locale, 1);
  const days = useMemo(() => getMonthGrid(currentDate, weekStartsOn), [currentDate, weekStartsOn]);
  const weekDays = useMemo(() => getWeekDays(currentDate, weekStartsOn), [currentDate, weekStartsOn]);
  const weeks = useMemo(
    () => Array.from({ length: Math.ceil(days.length / 7) }, (_, i) => days.slice(i * 7, i * 7 + 7)),
    [days],
  );

  // All-day and 24 h+ events become bars; timed events stay in their start day (cached buckets).
  const { dayEvents, timedEvents } = partitionDayEvents(events, timezone);
  const eventsByDay = eventsByStartDay(timedEvents, timezone);
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
        {weeks.map((week) => {
          const { segments, laneCount } = layoutDayRow(week, dayEvents, timezone);
          const visibleLanes = Math.min(laneCount, MAX_LANES);

          return (
          <div key={week[0].toISOString()} className="relative grid grid-cols-7" style={{ height: ROW_HEIGHT }}>
            {week.map((day, column) => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const dayTimed = eventsByDay.get(dayKey) || [];
              const barsOnDay = segments.filter((s) => column >= s.startCol && column < s.startCol + s.span);
              const hiddenBars = barsOnDay.filter((s) => s.lane >= MAX_LANES).length;
              const shown = timedSlots(visibleLanes, dayTimed.length, hiddenBars);
              const hidden = hiddenBars + dayTimed.length - shown;
              const total = barsOnDay.length + dayTimed.length;

              const isCurrentMonth = isSameMonth(day, currentDate);
              const cellId = day.toISOString();

              return (
                <DroppableCell
                  key={cellId}
                  id={cellId}
                  date={day}
                  className={cn(
                    "h-full p-2 border-b-[0.5px] border-r-[0.5px] border-border/30 last:border-r-0 relative transition-all duration-200 hover:bg-accent/5 flex flex-col gap-1.5 overflow-hidden group",
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
                    {total > 0 && (
                      <div className="text-[10px] font-medium text-muted-foreground/60 bg-muted/50 px-1.5 py-0.5 rounded-full">
                        {total}
                      </div>
                    )}
                  </div>

                  {/* Room for the all-day bars drawn across the week */}
                  {visibleLanes > 0 && <div className="shrink-0" style={{ height: visibleLanes * LANE_HEIGHT - 6 }} />}

                  <div className="flex-1 flex flex-col gap-1 scrollbar-hide overflow-y-auto overflow-x-hidden">
                    {dayTimed.slice(0, shown).map(event => (
                       <EventItem key={`${event.id}-${dayKey}`} event={event} onEventClick={onEventClick} onEventContextMenu={onEventContextMenu} />
                    ))}
                    {hidden > 0 && (
                        // "+N more" counts hidden bars and hidden timed events, and opens the day.
                        <button
                            type="button"
                            className="shrink-0 text-[10px] leading-4 text-primary font-semibold text-center py-0.5 px-2 rounded-md bg-primary/5 hover:bg-primary/10 cursor-pointer transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDateClick?.(day);
                            }}
                        >
                            {interpolate(translations?.moreEvents || '+{n} more', { n: hidden })}
                        </button>
                    )}
                  </div>
                </DroppableCell>
              );
            })}

            {/* All-day bars spanning the week */}
            <div className="absolute inset-x-0 pointer-events-none" style={{ top: BARS_TOP, height: visibleLanes * LANE_HEIGHT }}>
              {segments.filter((s) => s.lane < MAX_LANES).map((segment) => (
                <div key={`${segment.event.id}-${week[0].toISOString()}`} className="pointer-events-auto">
                  <AllDayBar
                    segment={segment}
                    rowDays={week}
                    laneHeight={LANE_HEIGHT}
                    timezone={timezone}
                    locale={locale}
                    translations={translations}
                    readonly={readonly}
                    onEventClick={onEventClick}
                    onEventContextMenu={onEventContextMenu}
                    onDayEventResize={onDayEventResize}
                  />
                </div>
              ))}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
};
