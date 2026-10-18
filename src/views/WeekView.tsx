import React from 'react';
import { addDays, format, differenceInMinutes, isSameDay, Locale } from 'date-fns';
import { CalendarEvent, CalendarTranslations } from '../types';
import { cx, isEventDragDisabled } from '../utils';
import { DaySegment, segmentsByDisplayDay } from '../core/events';
import { partitionDayEvents } from '../core/allDay';
import { AllDayRow } from '../components/AllDayRow';
import { timeFormats, timeZoneAbbreviation } from '../core/format';
import { layoutDayEvents } from '../core/layout';
import { displayToday, minutesSinceDisplayMidnight, resolveTimeZone, toDisplay } from '../core/timezone';
import { getWeekDays, resolveWeekStartsOn } from '../core/week';
import { DraggableEvent } from '../components/dnd/DraggableEvent';
import { DroppableCell } from '../components/dnd/DroppableCell';
import { ResizableEvent } from '../components/dnd/ResizableEvent';

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onTimeSlotClick?: (date: Date) => void;
  onEventResize?: (event: CalendarEvent, newEnd: Date) => void;
  timezone?: string;
  locale?: Locale;
  readonly?: boolean;
  onEventContextMenu?: (event: CalendarEvent, e: React.MouseEvent) => void;
  onDayEventResize?: (event: CalendarEvent, newLastDay: Date) => void;
  onAllDaySlotClick?: (day: Date) => void;
  translations?: Partial<CalendarTranslations>;
}

const HOUR_HEIGHT = 60; // px
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const QUARTERS = [0, 15, 30, 45];
const NO_SEGMENTS: DaySegment[] = [];

const slotDate = (day: Date, hour: number, minute: number) => {
  const date = new Date(day);
  date.setHours(hour, minute, 0, 0);
  return date;
};

const WeekViewImpl: React.FC<WeekViewProps> = ({
  currentDate,
  events,
  onEventClick,
  onTimeSlotClick,
  onEventResize,
  timezone,
  locale,
  readonly,
  onEventContextMenu,
  onDayEventResize,
  onAllDaySlotClick,
  translations,
}) => {
  // Week start follows the locale (historical Monday fallback without a locale).
  const weekDays = React.useMemo(
    () => getWeekDays(currentDate, resolveWeekStartsOn(locale, 1)),
    [currentDate, locale],
  );

  // Only the days on screen get segments, so endless events stay cheap.
  const visibleRange = React.useMemo(
    () => ({ start: weekDays[0], end: addDays(weekDays[weekDays.length - 1], 1) }),
    [weekDays],
  );

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Scroll a few hours above the current time (in the display zone) on mount.
  React.useEffect(() => {
    if (scrollContainerRef.current) {
      const offsetHour = 4;
      scrollContainerRef.current.scrollTop = (toDisplay(new Date(), timezone).getHours() - offsetHour) * HOUR_HEIGHT;
    }
  }, [timezone]);

  // All-day and 24 h+ events go to the all-day row; the grid only shows timed events.
  const { dayEvents, timedEvents } = partitionDayEvents(events, timezone);
  const segmentsByDay = segmentsByDisplayDay(timedEvents, timezone, visibleRange);
  const today = displayToday(timezone, now);
  const zonedNow = toDisplay(now, timezone);
  const nowTop = (minutesSinceDisplayMidnight(now, timezone) / 60) * HOUR_HEIGHT;
  const showsToday = weekDays.some((day) => isSameDay(day, today));
  const zone = resolveTimeZone(timezone);
  const zoneLabel = timeZoneAbbreviation(now, zone) || zone || 'LOC';
  const formats = timeFormats(locale);

  return (
    <div className="flex flex-col h-full bg-background border-[0.5px] border-border/50 rounded-2xl overflow-hidden min-w-[800px] md:min-w-0 shadow-sm">
      {/* Scrollable Container - includes header for proper alignment.
          No scrollbar-gutter here: the scrollbar is hidden (scrollbar-hide),
          so reserving its space just leaves a blank strip after the last
          day column on classic-scrollbar platforms. */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto scrollbar-hide relative bg-background scroll-smooth"
      >
        {/* Header + all-day row - sticky inside scroll container */}
        <div className="sticky top-0 z-20">
        <div className="flex border-b-[0.5px] border-border/50 bg-gradient-to-r from-muted/20 via-background to-muted/20 backdrop-blur-sm">
          <div className="flex-none p-3 text-center text-xs font-semibold text-muted-foreground w-16 flex items-center justify-center border-r-[0.5px] border-border/30 bg-muted/10">
            <div className="flex flex-col items-center justify-center leading-tight">
              <span>{format(zonedNow, 'HH:mm')}</span>
              <span className="text-[10px] opacity-75">({zoneLabel})</span>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-7">
              {weekDays.map((day, index) => (
              <div key={day.toISOString()} className={cx("py-3 px-2 text-center", index > 0 && "border-l-[0.5px] border-border/30")}>
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{format(day, 'EEE', { locale })}</div>
                  <div className={cx(
                    "w-9 h-9 flex items-center justify-center rounded-xl mx-auto text-sm font-semibold transition-all duration-200",
                    isSameDay(day, today)
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110"
                      : "text-foreground hover:bg-accent/80"
                  )}>
                    {format(day, 'd', { locale })}
                  </div>
              </div>
              ))}
          </div>
        </div>
        <AllDayRow
          days={weekDays}
          dayEvents={dayEvents}
          timezone={timezone}
          locale={locale}
          translations={translations}
          readonly={readonly}
          gutterClassName="w-16"
          onEventClick={onEventClick}
          onEventContextMenu={onEventContextMenu}
          onDayEventResize={onDayEventResize}
          onSlotClick={onAllDaySlotClick}
        />
        </div>

        {/* Grid Content */}
        <div
          className="flex min-w-full relative"
          style={{ height: HOURS.length * HOUR_HEIGHT }}
        >
          {/* Time Labels Column */}
          <div className="flex-none w-16 border-r-[0.5px] border-border/30 relative bg-muted/5">
            {HOURS.map((hour) => (
                 <div
                   key={hour}
                   className="relative w-full text-[11px] text-muted-foreground/80 text-right pr-3 font-medium tabular-nums box-border"
                   style={{ height: HOUR_HEIGHT }}
                 >
                   <span className="block -translate-y-1/2">
                    {hour !== 0 && format(slotDate(currentDate, hour, 0), formats.hour, { locale })}
                   </span>
                 </div>
            ))}

            {/* Current Time Label (Left Axis), positioned in the grid so no header offset is needed */}
            {showsToday && (
              <div
                className="absolute left-0 w-full pointer-events-none z-30 flex justify-end pr-2"
                style={{ top: `${nowTop}px` }}
              >
                <span className="text-[10px] font-bold text-primary-foreground bg-primary px-1.5 py-0.5 rounded-md shadow-md -translate-y-1/2 backdrop-blur-none">
                  {format(zonedNow, formats.compact, { locale })}
                </span>
              </div>
            )}
          </div>

          {/* Days Columns */}
          <div className="flex-1 grid grid-cols-7 relative">
            {weekDays.map((day, dayIndex) => {
                const dayKey = format(day, 'yyyy-MM-dd');
                const positioned = layoutDayEvents(segmentsByDay.get(dayKey) ?? NO_SEGMENTS);

                return (
                <div key={dayKey} className={cx("relative h-full", dayIndex > 0 && "border-l-[0.5px] border-border/30")}>
                    {/* Grid Rows (Droppable Cells) */}
                    {HOURS.map((hour) => (
                        <div
                            key={hour}
                            className="w-full border-b-[0.5px] border-dashed border-border/20 box-border relative hover:bg-accent/5 transition-colors"
                            style={{ height: HOUR_HEIGHT }}
                        >
                            {/* 4 x 15-minute intervals */}
                            {QUARTERS.map((minute) => {
                                const cellDate = slotDate(day, hour, minute);
                                return (
                                    <DroppableCell
                                        key={minute}
                                        id={cellDate.toISOString()}
                                        date={cellDate}
                                        className="w-full absolute left-0 right-0 z-0 transition-colors"
                                        style={{
                                            height: '25%',
                                            top: `${(minute / 60) * 100}%`
                                        }}
                                        onSlotClick={onTimeSlotClick}
                                    />
                                );
                            })}
                        </div>
                    ))}

                    {/* Events Overlay */}
                    {positioned.map(({ event, start, end, column, columns }) => {
                        const widthPercent = 100 / columns;
                        const leftPercent = column * widthPercent;

                        const zonedEventStart = toDisplay(event.start, timezone);
                        const zonedEventEnd = toDisplay(event.end, timezone);

                        const startMinutes = start.getHours() * 60 + start.getMinutes();
                        const durationMinutes = differenceInMinutes(end, start);

                        const top = (startMinutes / 60) * HOUR_HEIGHT;
                        const height = (durationMinutes / 60) * HOUR_HEIGHT;

                        const isShortEvent = durationMinutes < 60;
                        // Only the segment holding the event's real end can be resized.
                        const isLastSegment = end.getTime() === zonedEventEnd.getTime();

                        return (
                            <DraggableEvent
                                key={`${event.id}-${dayKey}`}
                                dragId={`${event.id}@${dayKey}`}
                                grabOffsetMs={start.getTime() - zonedEventStart.getTime()}
                                event={event}
                                className={`absolute z-10 transition-all ${readonly ? "cursor-default" : ""}`}
                                style={{
                                    top: `${top}px`,
                                    height: `${Math.max(height, 20)}px`,
                                    left: `${leftPercent}%`,
                                    width: `${widthPercent}%`,
                                    // Add minimal spacing between overlapping events
                                    paddingRight: columns > 1 ? '2px' : '0'
                                }}
                            >
                                <ResizableEvent
                                    readonly={readonly || !isLastSegment}
                                    event={event}
                                    hourHeight={HOUR_HEIGHT}
                                    onResize={onEventResize}
                                    className="h-full"
                                    style={{ height: '100%' }}
                                >
                                    <div
                                        className={cx(
                                            "rounded-md border shadow-sm transition-all hover:shadow-md group overflow-hidden relative",
                                            "glass",
                                            readonly || isEventDragDisabled(event) ? "cursor-default" : "cursor-grab active:cursor-grabbing",
                                            !event.color && "border-primary/20 bg-primary/10",
                                            isShortEvent ? "px-1 flex items-center justify-center" : "p-2",
                                            // Add active border for overlapped events to distinguish them
                                            columns > 1 && "border-l-4 border-l-primary/50"
                                        )}
                                        style={{
                                            height: '100%',
                                            backgroundColor: event.color ? `${event.color}15` : undefined,
                                            borderColor: event.color ? `${event.color}40` : undefined,
                                            borderLeftWidth: '3px',
                                            borderLeftColor: event.color || 'var(--primary)'
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEventClick?.(event);
                                        }}
                                        onContextMenu={onEventContextMenu ? (e) => onEventContextMenu(event, e) : undefined}
                                        title={columns > 1 ? `${event.title} (${column + 1}/${columns})` : undefined}
                                    >
                                        <div className="flex flex-col h-full overflow-hidden w-full">
                                            <div className={cx("font-semibold truncate text-foreground/90",
                                                isShortEvent ? "text-xs text-center" : "text-xs"
                                            )}>
                                                {event.title}
                                            </div>
                                            {!isShortEvent && (
                                                <>
                                                    <div className="text-[10px] text-muted-foreground truncate mt-0.5 font-medium leading-tight">
                                                        {format(zonedEventStart, formats.time, { locale })} - {format(zonedEventEnd, formats.time, { locale })}
                                                    </div>
                                                    {event.description && height > 50 && (
                                                        <div className="text-[10px] text-muted-foreground/80 truncate mt-1 leading-tight opacity-80">
                                                            {event.description}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                            {/* Overlap Badge */}
                                            {columns > 1 && !isShortEvent && (
                                                <div className="absolute top-1 right-1 bg-background/80 backdrop-blur-sm rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold text-muted-foreground border border-border shadow-sm">
                                                    {columns}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </ResizableEvent>
                            </DraggableEvent>
                        );
                    })}

                    {/* Current Time Indicator */}
                    {isSameDay(day, today) && (
                    <div
                        className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                        style={{ top: `${nowTop}px` }}
                    >
                        <div className="h-[2px] w-full bg-gradient-to-r from-primary via-primary to-primary/50" />
                        <div className="absolute -left-1.5 w-3 h-3 bg-primary rounded-full shadow-lg shadow-primary/40 ring-2 ring-background animate-pulse" />
                    </div>
                    )}
                </div>
                );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// C6: skip re-rendering the whole grid when the scheduler re-renders with the same props.
export const WeekView = React.memo(WeekViewImpl);
