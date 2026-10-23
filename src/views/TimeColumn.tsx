import React from 'react';
import { Locale } from 'date-fns';
import { CalendarEvent, CalendarTranslations } from '../types';
import { cx } from '../utils';
import { DaySegment } from '../core/events';
import { DroppableCell } from '../components/dnd/DroppableCell';
import { type GhostEvent, TimeGridEvents } from './TimeGridEvents';
import { gridHours, gridOffset, gridSlots, offHours, slotDate, type TimeGrid } from './grid';

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
  /** A drag over free time, from the start of its first slot to the end of its last. */
  onRangeSelect?: (start: Date, end: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onEventContextMenu?: (event: CalendarEvent, e: React.MouseEvent) => void;
  onEventResize?: (event: CalendarEvent, newEnd: Date) => void;
  onMoreClick?: (events: CalendarEvent[]) => void;
  highlightId?: string;
  ghost?: GhostEvent;
  translations?: Partial<CalendarTranslations>;
}

/**
 * One day column of the week or day view: its slots, its events and the current-time line. With a
 * mouse or a pen, dragging over the slots selects a range (touch keeps scrolling the grid).
 */
export const TimeColumn: React.FC<TimeColumnProps> = ({
  day, dayKey, segments, grid, hourHeight, nowMinutes, className, onTimeSlotClick, onRangeSelect, ghost, ...events
}) => {
  const visibleNow = nowMinutes !== undefined && nowMinutes >= grid.startHour * 60 && nowMinutes <= grid.endHour * 60;
  // Minutes since midnight of the first and the current slot of a drag.
  const [range, setRange] = React.useState<{ from: number; to: number } | null>(null);

  const minuteAt = (column: HTMLElement, clientY: number) => {
    const rect = column.getBoundingClientRect();
    const y = grid.reverse ? rect.bottom - clientY : clientY - rect.top;
    const minute = grid.startHour * 60 + Math.floor((y / hourHeight) * (60 / grid.slotMinutes)) * grid.slotMinutes;
    return Math.min(Math.max(minute, grid.startHour * 60), grid.endHour * 60 - grid.slotMinutes);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Events (resize handles included, even locked ones) and "+N" keep their own gestures.
    if (!onRangeSelect || e.button !== 0 || e.pointerType === 'touch' || (e.target as HTMLElement).closest('[data-ck-drag], button')) return;
    const column = e.currentTarget;
    const startY = e.clientY;
    const from = minuteAt(column, startY);
    let to = from;
    const move = (m: PointerEvent) => {
      // No button down: the release was lost (a context menu, a window switch), so the gesture is over.
      if (m.buttons === 0) return end(m);
      // A few pixels of jitter keep it a click.
      if (to === from && Math.abs(m.clientY - startY) < 5) return;
      to = minuteAt(column, m.clientY);
      setRange({ from, to });
    };
    const end = (u: PointerEvent) => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', end);
      document.removeEventListener('pointercancel', end);
      setRange(null);
      // Without a move it stays a click: the slot's own handler opens it.
      if (u.type === 'pointerup' && to !== from) onRangeSelect(slotDate(day, Math.min(from, to)), slotDate(day, Math.max(from, to) + grid.slotMinutes));
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', end);
    document.addEventListener('pointercancel', end);
  };

  const selection = range && {
    start: slotDate(day, Math.min(range.from, range.to)),
    end: slotDate(day, Math.max(range.from, range.to) + grid.slotMinutes),
    title: '',
  };

  return (
    <div
      className={cx('ck:relative', grid.reverse && 'ck:flex ck:flex-col-reverse', onRangeSelect && 'ck:select-none', className)}
      onPointerDown={handlePointerDown}
    >
      {/* Outside working hours: drawn under the slots, which stay clickable. */}
      {offHours(grid, day).map(([from, to]) => (
        <div
          key={from}
          aria-hidden="true"
          // The edge touching the working hours gets a line (events.css), so they read as a band.
          data-ck-edge={grid.workingHours && to === Math.max(grid.workingHours.start * 60, grid.startHour * 60) && to < grid.endHour * 60 ? 'start' : grid.workingHours && from === Math.min(grid.workingHours.end * 60, grid.endHour * 60) && from > grid.startHour * 60 ? 'end' : undefined}
          data-ck-reverse={grid.reverse || undefined}
          className="ck-off-hours ck:absolute ck:inset-x-0 ck:pointer-events-none"
          style={{ ...gridOffset(grid, from, hourHeight), height: `${((to - from) / 60) * hourHeight}px` }}
        />
      ))}
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
                style={{ height: `${(grid.slotMinutes / 60) * 100}%`, [grid.reverse ? 'bottom' : 'top']: `${(minute / 60) * 100}%` }}
                onSlotClick={onTimeSlotClick}
              />
            );
          })}
        </div>
      ))}

      <TimeGridEvents dayKey={dayKey} segments={clipSegments(segments, day, grid)} grid={grid} hourHeight={hourHeight} ghost={selection ?? ghost} {...events} />

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
