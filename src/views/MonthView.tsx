import React, { useMemo } from 'react';
import { format, isSameDay, isSameMonth, Locale } from 'date-fns';
import { CalendarEvent, CalendarTranslations } from '../types';
import { interpolate } from '../core/format';
import { cx } from '../utils';
import { useClassNames, useComponents } from '../components/customize';
import { eventsByStartDay } from '../core/events';
import { layoutDayRow, partitionDayEvents } from '../core/allDay';
import { AllDayBar } from '../components/AllDayBar';
import { displayToday } from '../core/timezone';
import { getMonthGrid, getWeekDays, resolveWeekStartsOn } from '../core/week';
import { useEventColorStyle } from '../components/eventColor';
import { TODAY_MARK } from '../components/todayMark';
import { useEventLabel } from '../components/eventLabel';
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

// A timed event in a month cell: its calendar colour as a dot, the title in the text colour.
const EventItem = React.memo(({ event, onEventClick, onEventContextMenu }: EventItemProps) => {
    const colorStyle = useEventColorStyle(event);
    const classNames = useClassNames();
    const { EventContent } = useComponents();
    const label = useEventLabel()(event);
    return (
    <DraggableEvent event={event}>
        <button
            type="button"
            aria-label={label}
            className={cx("ck:flex ck:w-full ck:text-left ck:items-center ck:gap-1.5 ck:text-xs ck:px-1.5 ck:py-0.5 ck:rounded-md ck:cursor-pointer ck:text-foreground ck:hover:bg-muted ck:transition-colors", classNames.event)}
            title={event.title}
            data-ck-event
            data-ck-event-id={event.id}
            onClick={(e) => {
              e.stopPropagation();
              onEventClick?.(event);
            }}
            onContextMenu={onEventContextMenu ? (e) => onEventContextMenu(event, e) : undefined}
        >
            <span className="ck-dot ck:w-2 ck:h-2 ck:rounded-[3px] ck:shrink-0" style={colorStyle} aria-hidden="true" />
            {EventContent ? <EventContent event={event} variant="chip" /> : <span className="ck:font-medium ck:truncate">{event.title}</span>}
        </button>
    </DraggableEvent>
    );
});

EventItem.displayName = 'EventItem';

const ROW_HEIGHT = 130; // px per week row (unchanged)
const LANE_HEIGHT = 20;
const MAX_LANES = 3; // all-day lanes shown per week before "+N more"
const MAX_ITEMS = 3; // timed chips per day, then "+N more" (spec §8.4)
const BARS_TOP = 38; // below the day number
const CELL_CHROME = 16 + 28 + 6; // cell padding, day number, gap
const ITEM_GAP = 4;
const ITEM_STEP = 20 + ITEM_GAP; // timed chip + gap

// Timed chips that fit under the bars (at most 3). "+N more" sits next to the day number, so the
// chips keep the whole room.
function timedSlots(visibleLanes: number, timedCount: number): number {
  const room = ROW_HEIGHT - CELL_CHROME - visibleLanes * LANE_HEIGHT;
  return Math.min(timedCount, MAX_ITEMS, Math.max(0, Math.floor((room + ITEM_GAP) / ITEM_STEP)));
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
    <div className="ck:flex ck:flex-col ck:h-full ck:bg-background ck:border-[0.5px] ck:border-border/50 ck:rounded-2xl ck:overflow-hidden ck:min-w-[800px] ck:md:min-w-0 ck:shadow-xs">
      <div className="ck:overflow-y-auto ck:flex-1 ck:relative">
        {/* Sticky Header */}
        <div className="ck:grid ck:grid-cols-7 ck:border-b-[0.5px] ck:border-border/50 ck:bg-linear-to-r ck:from-muted/30 ck:via-muted/40 ck:to-muted/30 ck:sticky ck:top-0 ck:z-20 ck:backdrop-blur-xs">
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className="ck:py-3 ck:text-center ck:text-xs ck:font-semibold ck:text-muted-foreground ck:border-r-[0.5px] ck:border-border/30 ck:last:border-r-0 ck:uppercase ck:tracking-wider"
            >
              {format(day, 'EEE', { locale })}
            </div>
          ))}
        </div>
        {weeks.map((week) => {
          const { segments, laneCount } = layoutDayRow(week, dayEvents, timezone);
          const visibleLanes = Math.min(laneCount, MAX_LANES);

          return (
          <div key={week[0].toISOString()} className="ck:relative ck:grid ck:grid-cols-7" style={{ height: ROW_HEIGHT }}>
            {week.map((day, column) => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const dayTimed = eventsByDay.get(dayKey) || [];
              const barsOnDay = segments.filter((s) => column >= s.startCol && column < s.startCol + s.span);
              const hiddenBars = barsOnDay.filter((s) => s.lane >= MAX_LANES).length;
              const shown = timedSlots(visibleLanes, dayTimed.length);
              const hidden = hiddenBars + dayTimed.length - shown;

              const isCurrentMonth = isSameMonth(day, currentDate);
              const cellId = day.toISOString();

              return (
                <DroppableCell
                  key={cellId}
                  id={cellId}
                  date={day}
                  className={cx(
                    "ck:h-full ck:p-2 ck:border-b-[0.5px] ck:border-r-[0.5px] ck:border-border/30 ck:last:border-r-0 ck:relative ck:transition-all ck:duration-200 ck:flex ck:flex-col ck:gap-1.5 ck:overflow-hidden ck:group",
                    !isCurrentMonth && "ck:text-muted-foreground/60"
                  )}
                  idleClassName={
                    isSameDay(day, today)
                      ? "ck:bg-primary/5 ck:ring-1 ck:ring-inset ck:ring-primary/20"
                      : !isCurrentMonth ? "ck:bg-muted/5" : undefined
                  }
                  onClick={() => onDateClick?.(day)}
                >
                  <div className="ck:flex ck:justify-between ck:items-start">
                    <button
                      type="button"
                      aria-label={format(day, 'EEEE d MMMM yyyy', { locale })}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDateClick?.(day);
                      }}
                      className={cx(
                      "ck:text-sm ck:font-semibold ck:w-7 ck:h-7 ck:flex ck:items-center ck:justify-center ck:tabular-nums ck:transition-colors ck:duration-200",
                      isSameDay(day, today) ? TODAY_MARK : "ck:rounded-full ck:group-hover:bg-accent"
                    )}>
                      {format(day, 'd', { locale })}
                    </button>
                    {hidden > 0 && (
                        // "+N more" counts hidden bars and hidden timed events, and opens the day.
                        <button
                            type="button"
                            className="ck:text-xs ck:font-semibold ck:text-muted-foreground ck:px-1.5 ck:py-0.5 ck:rounded-md ck:hover:bg-muted ck:hover:text-foreground ck:transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDateClick?.(day);
                            }}
                        >
                            {interpolate(translations?.moreEvents || '+{n} more', { n: hidden })}
                        </button>
                    )}
                  </div>

                  {/* Room for the all-day bars drawn across the week */}
                  {visibleLanes > 0 && <div className="ck:shrink-0" style={{ height: visibleLanes * LANE_HEIGHT - 6 }} />}

                  <div className="ck:flex-1 ck:flex ck:flex-col ck:gap-1 ck:overflow-hidden">
                    {dayTimed.slice(0, shown).map(event => (
                       <EventItem key={`${event.id}-${dayKey}`} event={event} onEventClick={onEventClick} onEventContextMenu={onEventContextMenu} />
                    ))}
                  </div>
                </DroppableCell>
              );
            })}

            {/* All-day bars spanning the week */}
            <div className="ck:absolute ck:inset-x-0 ck:pointer-events-none" style={{ top: BARS_TOP, height: visibleLanes * LANE_HEIGHT }}>
              {segments.filter((s) => s.lane < MAX_LANES).map((segment) => (
                <div key={`${segment.event.id}-${week[0].toISOString()}`} className="ck:pointer-events-auto">
                  <AllDayBar
                    segment={segment}
                    rowDays={week}
                    laneHeight={LANE_HEIGHT}
                    timezone={timezone}
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
