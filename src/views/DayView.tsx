import React from 'react';
import { addDays, format, differenceInMinutes, isSameDay, Locale, startOfDay } from 'date-fns';
import { CalendarEvent, CalendarTranslations } from '../types';
import { cn, isEventDragDisabled } from '../utils';
import { DaySegment, segmentsByDisplayDay } from '../core/events';
import { partitionDayEvents } from '../core/allDay';
import { AllDayRow } from '../components/AllDayRow';
import { timeFormats } from '../core/format';
import { layoutDayEvents } from '../core/layout';
import { displayToday, minutesSinceDisplayMidnight, toDisplay } from '../core/timezone';
import { DraggableEvent } from '../components/dnd/DraggableEvent';
import { DroppableCell } from '../components/dnd/DroppableCell';
import { ResizableEvent } from '../components/dnd/ResizableEvent';

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onTimeSlotClick?: (date: Date) => void;
  onEventResize?: (event: CalendarEvent, newEnd: Date) => void;
  timezone?: string;
  locale?: Locale;
  readonly?: boolean;
  onEventContextMenu?: (event: CalendarEvent, e: React.MouseEvent) => void;
  translations?: Partial<CalendarTranslations>;
  onDayEventResize?: (event: CalendarEvent, newLastDay: Date) => void;
  onAllDaySlotClick?: (day: Date) => void;
}

const HOUR_HEIGHT = 80; // Larger height for Day View
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const QUARTERS = [0, 15, 30, 45];
const NO_SEGMENTS: DaySegment[] = [];

const slotDate = (day: Date, hour: number, minute: number) => {
  const date = new Date(day);
  date.setHours(hour, minute, 0, 0);
  return date;
};

const DayViewImpl: React.FC<DayViewProps> = ({
  currentDate,
  events,
  onEventClick,
  onTimeSlotClick,
  onEventResize,
  timezone,
  locale,
  readonly,
  onEventContextMenu,
  translations,
  onDayEventResize,
  onAllDaySlotClick
}) => {
  // Only the day on screen gets segments, so endless events stay cheap.
  const visibleRange = React.useMemo(() => {
    const start = startOfDay(currentDate);
    return { start, end: addDays(start, 1) };
  }, [currentDate]);

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Scroll a few hours above the current time (in the display zone) on mount.
  React.useEffect(() => {
    if (scrollContainerRef.current) {
      const offsetHour = 3;
      scrollContainerRef.current.scrollTop = (toDisplay(new Date(), timezone).getHours() - offsetHour) * HOUR_HEIGHT;
    }
  }, [timezone]);

  const dayKey = format(currentDate, 'yyyy-MM-dd');
  // All-day and 24 h+ events go to the all-day row; the grid only shows timed events.
  const { dayEvents, timedEvents } = partitionDayEvents(events, timezone);
  const rowDays = React.useMemo(() => [visibleRange.start], [visibleRange]);
  const positioned = layoutDayEvents(segmentsByDisplayDay(timedEvents, timezone, visibleRange).get(dayKey) ?? NO_SEGMENTS);
  const isToday = isSameDay(currentDate, displayToday(timezone, now));
  const zonedNow = toDisplay(now, timezone);
  const nowTop = (minutesSinceDisplayMidnight(now, timezone) / 60) * HOUR_HEIGHT;
  const formats = timeFormats(locale);

  return (
    <div className="flex flex-col h-full bg-background border-[0.5px] border-border/50 rounded-2xl overflow-hidden shadow-sm">
        {/* Header */}
        <div className="px-6 py-4 border-b-[0.5px] border-border/50 bg-gradient-to-r from-muted/20 via-background to-muted/20 text-center shrink-0">
            <div className="flex items-center justify-center gap-3">
                <h2 className="text-xl font-semibold capitalize text-foreground">
                    {format(currentDate, 'EEEE, MMMM d, yyyy', { locale })}
                </h2>
                {isToday && (
                    <span className="text-xs font-semibold bg-primary text-primary-foreground px-3 py-1 rounded-full shadow-md shadow-primary/20">
                        {translations?.today || 'Today'}
                    </span>
                )}
            </div>
        </div>

        <AllDayRow
          days={rowDays}
          dayEvents={dayEvents}
          timezone={timezone}
          locale={locale}
          translations={translations}
          readonly={readonly}
          gutterClassName="w-20"
          onEventClick={onEventClick}
          onEventContextMenu={onEventContextMenu}
          onDayEventResize={onDayEventResize}
          onSlotClick={onAllDaySlotClick}
        />

        {/* Grid */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative">
            <div className="flex relative" style={{ height: HOURS.length * HOUR_HEIGHT }}>
                {/* Time Labels */}
                <div className="w-20 bg-muted/5 border-r-[0.5px] border-border/30 relative">
                     {HOURS.map((hour) => (
                        <div
                            key={hour}
                            className="relative w-full"
                            style={{ height: HOUR_HEIGHT }}
                        >
                            {hour !== 0 && (
                                <span className="absolute w-full text-center -top-3 left-1/2 -translate-x-1/2 text-[11px] text-muted-foreground/80 font-medium tabular-nums bg-background px-1.5 py-0.5 rounded-md">
                                    {format(slotDate(currentDate, hour, 0), formats.hour, { locale })}
                                </span>
                            )}
                        </div>
                     ))}

                     {/* Left Side Current Time Indicator (Overlay) */}
                     {isToday && (
                         <div
                             className="absolute left-0 w-full pointer-events-none z-30 flex justify-end pr-2"
                             style={{ top: `${nowTop}px` }}
                         >
                             <span className="text-[10px] font-bold text-white bg-primary px-2 py-1 rounded-lg shadow-md shadow-primary/30 -translate-y-1/2">
                                 {format(zonedNow, formats.time, { locale })}
                             </span>
                         </div>
                     )}
                </div>

                {/* Day Column */}
                <div className="flex-1 relative">
                     {HOURS.map((hour) => (
                        <div
                            key={hour}
                            className="border-b-[0.5px] border-dashed border-border/20 box-border relative hover:bg-accent/5 transition-colors"
                            style={{ height: HOUR_HEIGHT }}
                        >
                            {/* 4 x 15-minute intervals */}
                            {QUARTERS.map((minute) => {
                                const cellDate = slotDate(currentDate, hour, minute);
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

                     {positioned.map(({ event, start, end, column, columns }) => {
                       const widthPercent = 100 / columns;
                       const leftPercent = column * widthPercent;

                       const zonedStart = toDisplay(event.start, timezone);
                       const zonedEnd = toDisplay(event.end, timezone);

                       const startMinutes = start.getHours() * 60 + start.getMinutes();
                       const durationMinutes = differenceInMinutes(end, start);
                       const top = (startMinutes / 60) * HOUR_HEIGHT;
                       const height = (durationMinutes / 60) * HOUR_HEIGHT;

                       const isShortEvent = durationMinutes < 45;
                       // Only the segment holding the event's real end can be resized.
                       const isLastSegment = end.getTime() === zonedEnd.getTime();

                       return (
                         <DraggableEvent
                            key={`${event.id}-${dayKey}`}
                            dragId={`${event.id}@${dayKey}`}
                            grabOffsetMs={start.getTime() - zonedStart.getTime()}
                            event={event}
                            className={`absolute z-10 transition-all ${readonly ? "cursor-default" : ""}`}
                            style={{
                                top: `${top}px`,
                                height: `${Math.max(height, 28)}px`,
                                left: `calc(${leftPercent}% + 4px)`,
                                width: `calc(${widthPercent}% - 8px)`,
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
                                    className={cn(
                                        "h-full rounded-lg border-[0.5px] shadow-sm overflow-hidden transition-all hover:shadow-lg hover:z-20 group",
                                        "glass backdrop-blur-sm",
                                        readonly || isEventDragDisabled(event) ? "cursor-default" : "cursor-grab active:cursor-grabbing",
                                        !event.color && "bg-primary/10 border-primary/20",
                                        isShortEvent ? "px-2 flex items-center" : "px-3 py-2",
                                        columns > 1 && "border-l-4"
                                    )}
                                    style={{
                                        backgroundColor: event.color ? `${event.color}15` : undefined,
                                        borderColor: event.color ? `${event.color}30` : undefined,
                                        borderLeftColor: event.color || 'var(--primary)',
                                        borderLeftWidth: columns > 1 ? '4px' : '3px'
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEventClick?.(event);
                                    }}
                                    onContextMenu={onEventContextMenu ? (e) => onEventContextMenu(event, e) : undefined}
                                    title={columns > 1 ? `${event.title} (${column + 1}/${columns})` : undefined}
                                >
                                    <div className="flex flex-col h-full overflow-hidden w-full">
                                        <div className={cn(
                                            "font-semibold truncate leading-tight",
                                            isShortEvent ? "text-xs" : "text-sm",
                                            event.color ? "text-foreground" : "text-foreground/90"
                                        )}>
                                            {event.title}
                                        </div>
                                        {!isShortEvent && (
                                            <>
                                                <div className="text-xs text-muted-foreground mt-0.5 font-medium">
                                                    {format(zonedStart, formats.time, { locale })} - {format(zonedEnd, formats.time, { locale })}
                                                </div>
                                                {event.description && height > 60 && (
                                                    <div className="text-xs text-muted-foreground/80 mt-1 line-clamp-2">
                                                        {event.description}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        {/* Overlap Badge */}
                                        {columns > 1 && !isShortEvent && (
                                            <div className="absolute top-1.5 right-1.5 bg-background/90 backdrop-blur-sm rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold text-muted-foreground border border-border shadow-sm">
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
                     {isToday && (
                       <div
                         className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                         style={{ top: `${nowTop}px` }}
                       >
                         {/* Line */}
                         <div className="h-[2px] w-full bg-gradient-to-r from-primary via-primary to-primary/50" />
                         {/* Dot */}
                         <div className="absolute -left-1.5 w-3 h-3 bg-primary rounded-full shadow-lg shadow-primary/40 ring-2 ring-background animate-pulse" />
                       </div>
                     )}
                </div>
            </div>
        </div>
    </div>
  );
};

// C6: skip re-rendering the grid when the scheduler re-renders with the same props.
export const DayView = React.memo(DayViewImpl);
