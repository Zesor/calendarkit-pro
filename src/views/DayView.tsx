import React from 'react';
import { addDays, format, differenceInMinutes, isSameDay, Locale, startOfDay } from 'date-fns';
import { CalendarEvent, CalendarTranslations } from '../types';
import { cx, isEventDragDisabled } from '../utils';
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
    <div className="ck:flex ck:flex-col ck:h-full ck:bg-background ck:border-[0.5px] ck:border-border/50 ck:rounded-2xl ck:overflow-hidden ck:shadow-xs">
        {/* Header */}
        <div className="ck:px-6 ck:py-4 ck:border-b-[0.5px] ck:border-border/50 ck:bg-linear-to-r ck:from-muted/20 ck:via-background ck:to-muted/20 ck:text-center ck:shrink-0">
            <div className="ck:flex ck:items-center ck:justify-center ck:gap-3">
                <h2 className="ck:text-xl ck:font-semibold ck:capitalize ck:text-foreground">
                    {format(currentDate, 'EEEE, MMMM d, yyyy', { locale })}
                </h2>
                {isToday && (
                    <span className="ck:text-xs ck:font-semibold ck:bg-primary ck:text-primary-foreground ck:px-3 ck:py-1 ck:rounded-full ck:shadow-md ck:shadow-primary/20">
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
          gutterClassName="ck:w-20"
          onEventClick={onEventClick}
          onEventContextMenu={onEventContextMenu}
          onDayEventResize={onDayEventResize}
          onSlotClick={onAllDaySlotClick}
        />

        {/* Grid */}
        <div ref={scrollContainerRef} className="ck:flex-1 ck:overflow-y-auto ck:relative">
            <div className="ck:flex ck:relative" style={{ height: HOURS.length * HOUR_HEIGHT }}>
                {/* Time Labels */}
                <div className="ck:w-20 ck:bg-muted/5 ck:border-r-[0.5px] ck:border-border/30 ck:relative">
                     {HOURS.map((hour) => (
                        <div
                            key={hour}
                            className="ck:relative ck:w-full"
                            style={{ height: HOUR_HEIGHT }}
                        >
                            {hour !== 0 && (
                                <span className="ck:absolute ck:w-full ck:text-center ck:-top-3 ck:left-1/2 ck:-translate-x-1/2 ck:text-[11px] ck:text-muted-foreground/80 ck:font-medium ck:tabular-nums ck:bg-background ck:px-1.5 ck:py-0.5 ck:rounded-md">
                                    {format(slotDate(currentDate, hour, 0), formats.hour, { locale })}
                                </span>
                            )}
                        </div>
                     ))}

                     {/* Left Side Current Time Indicator (Overlay) */}
                     {isToday && (
                         <div
                             className="ck:absolute ck:left-0 ck:w-full ck:pointer-events-none ck:z-30 ck:flex ck:justify-end ck:pr-2"
                             style={{ top: `${nowTop}px` }}
                         >
                             <span className="ck:text-[10px] ck:font-bold ck:text-primary-foreground ck:bg-primary ck:px-2 ck:py-1 ck:rounded-lg ck:shadow-md ck:shadow-primary/30 ck:-translate-y-1/2">
                                 {format(zonedNow, formats.time, { locale })}
                             </span>
                         </div>
                     )}
                </div>

                {/* Day Column */}
                <div className="ck:flex-1 ck:relative">
                     {HOURS.map((hour) => (
                        <div
                            key={hour}
                            className="ck:border-b-[0.5px] ck:border-dashed ck:border-border/20 ck:box-border ck:relative ck:hover:bg-accent/5 ck:transition-colors"
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
                                        className="ck:w-full ck:absolute ck:left-0 ck:right-0 ck:z-0 ck:transition-colors"
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
                            className={`ck:absolute ck:z-10 ck:transition-all ${readonly ? "ck:cursor-default" : ""}`}
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
                                className="ck:h-full"
                                style={{ height: '100%' }}
                            >
                                <div
                                    className={cx(
                                        "ck:h-full ck:rounded-lg ck:border-[0.5px] ck:shadow-xs ck:overflow-hidden ck:transition-all ck:hover:shadow-lg ck:hover:z-20 ck:group",
                                        "ck:backdrop-blur-xs",
                                        readonly || isEventDragDisabled(event) ? "ck:cursor-default" : "ck:cursor-grab ck:active:cursor-grabbing",
                                        !event.color && "ck:bg-primary/10 ck:border-primary/20",
                                        isShortEvent ? "ck:px-2 ck:flex ck:items-center" : "ck:px-3 ck:py-2",
                                        columns > 1 && "ck:border-l-4"
                                    )}
                                    style={{
                                        backgroundColor: event.color ? `${event.color}15` : undefined,
                                        borderColor: event.color ? `${event.color}30` : undefined,
                                        borderLeftColor: event.color || 'var(--ck-primary)',
                                        borderLeftWidth: columns > 1 ? '4px' : '3px'
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEventClick?.(event);
                                    }}
                                    onContextMenu={onEventContextMenu ? (e) => onEventContextMenu(event, e) : undefined}
                                    title={columns > 1 ? `${event.title} (${column + 1}/${columns})` : undefined}
                                >
                                    <div className="ck:flex ck:flex-col ck:h-full ck:overflow-hidden ck:w-full">
                                        <div className={cx(
                                            "ck:font-semibold ck:truncate",
                                            isShortEvent ? "ck:text-xs" : "ck:text-sm",
                                            event.color ? "ck:text-foreground" : "ck:text-foreground/90"
                                        )}>
                                            {event.title}
                                        </div>
                                        {!isShortEvent && (
                                            <>
                                                <div className="ck:text-xs ck:text-muted-foreground ck:mt-0.5 ck:font-medium">
                                                    {format(zonedStart, formats.time, { locale })} - {format(zonedEnd, formats.time, { locale })}
                                                </div>
                                                {event.description && height > 60 && (
                                                    <div className="ck:text-xs ck:text-muted-foreground/80 ck:mt-1 ck:line-clamp-2">
                                                        {event.description}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        {/* Overlap Badge */}
                                        {columns > 1 && !isShortEvent && (
                                            <div className="ck:absolute ck:top-1.5 ck:right-1.5 ck:bg-background/90 ck:backdrop-blur-xs ck:rounded-full ck:w-5 ck:h-5 ck:flex ck:items-center ck:justify-center ck:text-[10px] ck:font-bold ck:text-muted-foreground ck:border ck:border-border ck:shadow-xs">
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
                         className="ck:absolute ck:left-0 ck:right-0 ck:z-20 ck:pointer-events-none ck:flex ck:items-center"
                         style={{ top: `${nowTop}px` }}
                       >
                         {/* Line */}
                         <div className="ck:h-[2px] ck:w-full ck:bg-linear-to-r ck:from-primary ck:via-primary ck:to-primary/50" />
                         {/* Dot */}
                         <div className="ck:absolute ck:-left-1.5 ck:w-3 ck:h-3 ck:bg-primary ck:rounded-full ck:shadow-lg ck:shadow-primary/40 ck:ring-2 ck:ring-background ck:animate-pulse" />
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
