import React from 'react';
import { addDays, format, isSameDay, Locale, startOfDay } from 'date-fns';
import { CalendarEvent, CalendarTranslations } from '../types';
import { cx } from '../utils';
import { DaySegment, segmentsByDisplayDay } from '../core/events';
import { partitionDayEvents } from '../core/allDay';
import { AllDayRow } from '../components/AllDayRow';
import { timeFormats } from '../core/format';
import { displayToday, minutesSinceDisplayMidnight, toDisplay } from '../core/timezone';
import { useElementWidth } from '../hooks/useElementWidth';
import { DAY_MAX_COLUMNS, type GhostEvent } from './TimeGridEvents';
import { TimeColumn } from './TimeColumn';
import { DEFAULT_GRID, gridHours, gridOffset, gridScrollTop, slotDate, type TimeGrid } from './grid';

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onTimeSlotClick?: (date: Date) => void;
  /** A drag over free time (mouse or pen): the range from its first slot to the end of its last. */
  onTimeRangeSelect?: (start: Date, end: Date) => void;
  onEventResize?: (event: CalendarEvent, newEnd: Date) => void;
  timezone?: string;
  locale?: Locale;
  readonly?: boolean;
  onEventContextMenu?: (event: CalendarEvent, e: React.MouseEvent) => void;
  translations?: Partial<CalendarTranslations>;
  onDayEventResize?: (event: CalendarEvent, newLastDay: Date) => void;
  onAllDaySlotClick?: (day: Date) => void;
  /** "+N" in the grid: the events of a cluster that did not fit. */
  onMoreClick?: (events: CalendarEvent[]) => void;
  /** Id of the event just created or moved, outlined briefly. */
  highlightId?: string;
  /** Quick create: the new event's draft, drawn in its column. */
  draft?: GhostEvent & { allDay: boolean };
  /** Visible hours and slots (`dayStartHour`, `dayEndHour`…). */
  grid?: TimeGrid;
}

const HOUR_HEIGHT = 80; // Larger height for Day View
const NO_SEGMENTS: DaySegment[] = [];

const DayViewImpl: React.FC<DayViewProps> = ({
  currentDate,
  events,
  onEventClick,
  onTimeSlotClick,
  onTimeRangeSelect,
  onEventResize,
  timezone,
  locale,
  readonly,
  onEventContextMenu,
  translations,
  onDayEventResize,
  onAllDaySlotClick,
  onMoreClick,
  draft,
  highlightId,
  grid = DEFAULT_GRID,
}) => {
  // Only the day on screen gets segments, so endless events stay cheap.
  const visibleRange = React.useMemo(() => {
    const start = startOfDay(currentDate);
    return { start, end: addDays(start, 1) };
  }, [currentDate]);

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [gridRef, gridWidth] = useElementWidth<HTMLDivElement>();
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Scroll a few hours above the current time (in the display zone) on mount.
  React.useEffect(() => {
    if (scrollContainerRef.current) {
      const offsetHour = 3;
      scrollContainerRef.current.scrollTop = gridScrollTop(grid, toDisplay(new Date(), timezone).getHours(), offsetHour, HOUR_HEIGHT);
    }
  }, [timezone, grid]);

  const dayKey = format(currentDate, 'yyyy-MM-dd');
  // All-day and 24 h+ events go to the all-day row; the grid only shows timed events.
  const { dayEvents, timedEvents } = partitionDayEvents(events, timezone);
  const rowDays = React.useMemo(() => [visibleRange.start], [visibleRange]);
  const segments = segmentsByDisplayDay(timedEvents, timezone, visibleRange).get(dayKey) ?? NO_SEGMENTS;
  const isToday = isSameDay(currentDate, displayToday(timezone, now));
  const zonedNow = toDisplay(now, timezone);
  const nowMinutes = minutesSinceDisplayMidnight(now, timezone);
  const hours = gridHours(grid);
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
            <div className="ck:flex ck:relative" style={{ height: hours.length * HOUR_HEIGHT }}>
                {/* Time Labels */}
                <div className={cx("ck:w-20 ck:bg-muted/5 ck:border-r-[0.5px] ck:border-border/30 ck:relative", grid.reverse && "ck:flex ck:flex-col-reverse")}>
                     {hours.map((hour) => (
                        <div
                            key={hour}
                            className="ck:relative ck:w-full"
                            style={{ height: HOUR_HEIGHT }}
                        >
                            {hour !== grid.startHour && (
                                <span className={cx("ck:absolute ck:w-full ck:text-center ck:left-1/2 ck:-translate-x-1/2 ck:text-[11px] ck:text-muted-foreground/80 ck:font-medium ck:tabular-nums ck:bg-background ck:px-1.5 ck:py-0.5 ck:rounded-md", grid.reverse ? "ck:-bottom-3" : "ck:-top-3")}>
                                    {format(slotDate(currentDate, hour * 60), formats.hour, { locale })}
                                </span>
                            )}
                        </div>
                     ))}

                     {/* Left Side Current Time Indicator (Overlay) */}
                     {isToday && nowMinutes >= grid.startHour * 60 && nowMinutes <= grid.endHour * 60 && (
                         <div
                             className="ck:absolute ck:left-0 ck:w-full ck:pointer-events-none ck:z-30 ck:flex ck:justify-end ck:pr-2"
                             style={gridOffset(grid, nowMinutes, HOUR_HEIGHT)}
                         >
                             <span className={cx("ck:text-[10px] ck:font-bold ck:text-primary-foreground ck:bg-primary ck:px-2 ck:py-1 ck:rounded-lg ck:shadow-md ck:shadow-primary/30", grid.reverse ? "ck:translate-y-1/2" : "ck:-translate-y-1/2")}>
                                 {format(zonedNow, formats.time, { locale })}
                             </span>
                         </div>
                     )}
                </div>

                {/* Day Column */}
                <div ref={gridRef} className="ck:flex-1 ck:relative">
                    <TimeColumn
                        day={currentDate}
                        dayKey={dayKey}
                        segments={segments}
                        grid={grid}
                        hourHeight={HOUR_HEIGHT}
                        maxColumns={DAY_MAX_COLUMNS}
                        columnWidth={gridWidth}
                        inset={4}
                        nowMinutes={isToday ? nowMinutes : undefined}
                        className="ck:h-full"
                        timezone={timezone}
                        locale={locale}
                        readonly={readonly}
                        onTimeSlotClick={onTimeSlotClick}
                        onRangeSelect={onTimeRangeSelect}
                        onEventClick={onEventClick}
                        onEventContextMenu={onEventContextMenu}
                        onEventResize={onEventResize}
                        onMoreClick={onMoreClick}
                        highlightId={highlightId}
                        ghost={draft && !draft.allDay && isSameDay(draft.start, currentDate) ? draft : undefined}
                        translations={translations}
                    />
                </div>
            </div>
        </div>
    </div>
  );
};

// C6: skip re-rendering the grid when the scheduler re-renders with the same props.
export const DayView = React.memo(DayViewImpl);
