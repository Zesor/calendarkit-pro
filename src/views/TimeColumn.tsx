import React from 'react';
import { Locale } from 'date-fns';
import { CalendarEvent, CalendarTranslations } from '../types';
import { cx } from '../utils';
import { DaySegment } from '../core/events';
import { DroppableCell } from '../components/dnd/DroppableCell';
import { type GhostEvent, TimeGridEvents } from './TimeGridEvents';
import { gridHours, gridOffset, gridSlots, slotDate, type TimeGrid } from './grid';

/** The day's segments inside the visible hours, cut at their edges. */
function clipSegments(segments: DaySegment[], day: Date, grid: TimeGrid) {
  if (grid.startHour === 0 && grid.endHour === 24) return segments;
  const from = slotDate(day, grid.startHour * 60);
  const to = slotDate(day, grid.endHour * 60);
  return segments.flatMap((s) => (s.end <= from || s.start >= to ? [] : [{ ...s, start: s.start < from ? from : s.start, end: s.end > to ? to : s.end }]));
}

interface TimeColumnProps {
  day: Date;
  dayKey: string;
  /** The day's timed segments (wall clock in the display zone). */
  segments: DaySegment[];
  grid: TimeGrid;
  hourHeight: number;
  maxColumns: number;
  columnWidth?: number;
  inset?: number;
  /** Minutes since midnight of the current-time line, on today's column. */
  nowMinutes?: number;
  className?: string;
  timezone?: string;
  locale?: Locale;
  readonly?: boolean;
  onTimeSlotClick?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onEventContextMenu?: (event: CalendarEvent, e: React.MouseEvent) => void;
  onEventResize?: (event: CalendarEvent, newEnd: Date) => void;
  onMoreClick?: (events: CalendarEvent[]) => void;
  highlightId?: string;
  ghost?: GhostEvent;
  translations?: Partial<CalendarTranslations>;
}

/** One day column of the week or day view: its slots, its events and the current-time line. */
export const TimeColumn: React.FC<TimeColumnProps> = ({
  day, dayKey, segments, grid, hourHeight, nowMinutes, className, onTimeSlotClick, ...events
}) => {
  const visibleNow = nowMinutes !== undefined && nowMinutes >= grid.startHour * 60 && nowMinutes <= grid.endHour * 60;
  return (
    <div className={cx('ck:relative', className)}>
      {gridHours(grid).map((hour) => (
        <div
          key={hour}
          className="ck:w-full ck:border-b-[0.5px] ck:border-dashed ck:border-border/20 ck:box-border ck:relative ck:hover:bg-accent/5 ck:transition-colors"
          style={{ height: hourHeight }}
        >
          {gridSlots(grid).map((minute) => {
            const cellDate = slotDate(day, hour * 60 + minute);
            return (
              <DroppableCell
                key={minute}
                id={cellDate.toISOString()}
                date={cellDate}
                className="ck:w-full ck:absolute ck:left-0 ck:right-0 ck:z-0 ck:transition-colors"
                style={{ height: `${(grid.slotMinutes / 60) * 100}%`, top: `${(minute / 60) * 100}%` }}
                onSlotClick={onTimeSlotClick}
              />
            );
          })}
        </div>
      ))}

      <TimeGridEvents dayKey={dayKey} segments={clipSegments(segments, day, grid)} grid={grid} hourHeight={hourHeight} {...events} />

      {/* Current Time Indicator */}
      {visibleNow && (
        <div
          className="ck:absolute ck:left-0 ck:right-0 ck:z-20 ck:pointer-events-none ck:flex ck:items-center"
          style={gridOffset(grid, nowMinutes, hourHeight)}
        >
          <div className="ck:h-[2px] ck:w-full ck:bg-linear-to-r ck:from-primary ck:via-primary ck:to-primary/50" />
          <div className="ck:absolute ck:-left-1.5 ck:w-3 ck:h-3 ck:bg-primary ck:rounded-full ck:shadow-lg ck:shadow-primary/40 ck:ring-2 ck:ring-background ck:animate-pulse" />
        </div>
      )}
    </div>
  );
};
