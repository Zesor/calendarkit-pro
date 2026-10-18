import React from 'react';
import { addDays, format, isSameDay, Locale } from 'date-fns';
import { CalendarEvent, CalendarTranslations } from '../types';
import { cx } from '../utils';
import { DaySegment, segmentsByDisplayDay } from '../core/events';
import { partitionDayEvents } from '../core/allDay';
import { AllDayRow } from '../components/AllDayRow';
import { timeFormats, timeZoneAbbreviation } from '../core/format';
import { displayToday, minutesSinceDisplayMidnight, resolveTimeZone, toDisplay } from '../core/timezone';
import { getWeekDays, resolveWeekStartsOn } from '../core/week';
import { DroppableCell } from '../components/dnd/DroppableCell';
import { useElementWidth } from '../hooks/useElementWidth';
import { TimeGridEvents } from './TimeGridEvents';

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
  const [gridRef, gridWidth] = useElementWidth<HTMLDivElement>();
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
    <div className="ck:flex ck:flex-col ck:h-full ck:bg-background ck:border-[0.5px] ck:border-border/50 ck:rounded-2xl ck:overflow-hidden ck:min-w-[800px] ck:md:min-w-0 ck:shadow-xs">
      {/* Scrollable Container - includes header for proper alignment.
          No scrollbar-gutter here: the scrollbar is hidden (scrollbar-hide),
          so reserving its space just leaves a blank strip after the last
          day column on classic-scrollbar platforms. */}
      <div
        ref={scrollContainerRef}
        className="ck:flex-1 ck:overflow-y-auto ck:relative ck:bg-background ck:scroll-smooth"
      >
        {/* Header + all-day row - sticky inside scroll container */}
        <div className="ck:sticky ck:top-0 ck:z-20">
        <div className="ck:flex ck:border-b-[0.5px] ck:border-border/50 ck:bg-linear-to-r ck:from-muted/20 ck:via-background ck:to-muted/20 ck:backdrop-blur-xs">
          <div className="ck:flex-none ck:p-3 ck:text-center ck:text-xs ck:font-semibold ck:text-muted-foreground ck:w-16 ck:flex ck:items-center ck:justify-center ck:border-r-[0.5px] ck:border-border/30 ck:bg-muted/10">
            <div className="ck:flex ck:flex-col ck:items-center ck:justify-center ck:leading-tight">
              <span>{format(zonedNow, 'HH:mm')}</span>
              <span className="ck:text-[10px] ck:opacity-75">({zoneLabel})</span>
            </div>
          </div>
          <div className="ck:flex-1 ck:grid ck:grid-cols-7">
              {weekDays.map((day, index) => (
              <div key={day.toISOString()} className={cx("ck:py-3 ck:px-2 ck:text-center", index > 0 && "ck:border-l-[0.5px] ck:border-border/30")}>
                  <div className="ck:text-[10px] ck:font-semibold ck:text-muted-foreground ck:uppercase ck:tracking-wider ck:mb-1.5">{format(day, 'EEE', { locale })}</div>
                  <div className={cx(
                    "ck:w-9 ck:h-9 ck:flex ck:items-center ck:justify-center ck:rounded-xl ck:mx-auto ck:text-sm ck:font-semibold ck:transition-all ck:duration-200",
                    isSameDay(day, today)
                      ? "ck:bg-primary ck:text-primary-foreground ck:shadow-lg ck:shadow-primary/30 ck:scale-110"
                      : "ck:text-foreground ck:hover:bg-accent/80"
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
          gutterClassName="ck:w-16"
          onEventClick={onEventClick}
          onEventContextMenu={onEventContextMenu}
          onDayEventResize={onDayEventResize}
          onSlotClick={onAllDaySlotClick}
        />
        </div>

        {/* Grid Content */}
        <div
          className="ck:flex ck:min-w-full ck:relative"
          style={{ height: HOURS.length * HOUR_HEIGHT }}
        >
          {/* Time Labels Column */}
          <div className="ck:flex-none ck:w-16 ck:border-r-[0.5px] ck:border-border/30 ck:relative ck:bg-muted/5">
            {HOURS.map((hour) => (
                 <div
                   key={hour}
                   className="ck:relative ck:w-full ck:text-[11px] ck:text-muted-foreground/80 ck:text-right ck:pr-3 ck:font-medium ck:tabular-nums ck:box-border"
                   style={{ height: HOUR_HEIGHT }}
                 >
                   <span className="ck:block ck:-translate-y-1/2">
                    {hour !== 0 && format(slotDate(currentDate, hour, 0), formats.hour, { locale })}
                   </span>
                 </div>
            ))}

            {/* Current Time Label (Left Axis), positioned in the grid so no header offset is needed */}
            {showsToday && (
              <div
                className="ck:absolute ck:left-0 ck:w-full ck:pointer-events-none ck:z-30 ck:flex ck:justify-end ck:pr-2"
                style={{ top: `${nowTop}px` }}
              >
                <span className="ck:text-[10px] ck:font-bold ck:text-primary-foreground ck:bg-primary ck:px-1.5 ck:py-0.5 ck:rounded-md ck:shadow-md ck:-translate-y-1/2 ck:backdrop-blur-none">
                  {format(zonedNow, formats.compact, { locale })}
                </span>
              </div>
            )}
          </div>

          {/* Days Columns */}
          <div ref={gridRef} className="ck:flex-1 ck:grid ck:grid-cols-7 ck:relative">
            {weekDays.map((day, dayIndex) => {
                const dayKey = format(day, 'yyyy-MM-dd');

                return (
                <div key={dayKey} className={cx("ck:relative ck:h-full", dayIndex > 0 && "ck:border-l-[0.5px] ck:border-border/30")}>
                    {/* Grid Rows (Droppable Cells) */}
                    {HOURS.map((hour) => (
                        <div
                            key={hour}
                            className="ck:w-full ck:border-b-[0.5px] ck:border-dashed ck:border-border/20 ck:box-border ck:relative ck:hover:bg-accent/5 ck:transition-colors"
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

                    <TimeGridEvents
                        dayKey={dayKey}
                        segments={segmentsByDay.get(dayKey) ?? NO_SEGMENTS}
                        hourHeight={HOUR_HEIGHT}
                        columnWidth={gridWidth === undefined ? undefined : gridWidth / weekDays.length}
                        timezone={timezone}
                        locale={locale}
                        readonly={readonly}
                        onEventClick={onEventClick}
                        onEventContextMenu={onEventContextMenu}
                        onEventResize={onEventResize}
                    />

                    {/* Current Time Indicator */}
                    {isSameDay(day, today) && (
                    <div
                        className="ck:absolute ck:left-0 ck:right-0 ck:z-20 ck:pointer-events-none ck:flex ck:items-center"
                        style={{ top: `${nowTop}px` }}
                    >
                        <div className="ck:h-[2px] ck:w-full ck:bg-linear-to-r ck:from-primary ck:via-primary ck:to-primary/50" />
                        <div className="ck:absolute ck:-left-1.5 ck:w-3 ck:h-3 ck:bg-primary ck:rounded-full ck:shadow-lg ck:shadow-primary/40 ck:ring-2 ck:ring-background ck:animate-pulse" />
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
