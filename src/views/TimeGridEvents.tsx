import React from 'react';
import { differenceInMinutes, format, Locale } from 'date-fns';
import { CalendarEvent, CalendarTranslations } from '../types';
import { cx, isEventDragDisabled } from '../utils';
import { DaySegment } from '../core/events';
import { interpolate, timeFormats } from '../core/format';
import { layoutColumns } from '../core/overlap';
import { toDisplay } from '../core/timezone';
import { DraggableEvent } from '../components/dnd/DraggableEvent';
import { ResizableEvent } from '../components/dnd/ResizableEvent';
import { EventBlock } from '../components/EventBlock';
import { gridOffset, type TimeGrid } from './grid';

interface TimeGridEventsProps {
  dayKey: string;
  /** The day's timed segments (wall clock in the display zone). */
  segments: DaySegment[];
  grid: TimeGrid;
  hourHeight: number;
  /** Columns shown per overlap cluster before the extra events collapse into "+N" (spec §8.4). */
  maxColumns: number;
  /** Width of the day column in px, once measured. */
  columnWidth?: number;
  /** Space kept free on each side of the column, in px. */
  inset?: number;
  timezone?: string;
  locale?: Locale;
  readonly?: boolean;
  onEventClick?: (event: CalendarEvent) => void;
  onEventContextMenu?: (event: CalendarEvent, e: React.MouseEvent) => void;
  onEventResize?: (event: CalendarEvent, newEnd: Date) => void;
  /** "+N": the events that did not fit in their cluster. */
  onMoreClick?: (events: CalendarEvent[]) => void;
  /** Id of the event just created or moved, outlined briefly. */
  highlightId?: string;
  /** The event being created in this column (quick create), drawn dashed. */
  ghost?: GhostEvent;
  translations?: Partial<CalendarTranslations>;
}

/** A new event's draft, in wall-clock time of the display zone. */
export interface GhostEvent {
  start: Date;
  end: Date;
  title: string;
}

const minutesOf = (date: Date) => date.getHours() * 60 + date.getMinutes();

/** Columns per cluster in the week view: readable columns of about 75 px, 2 to 3 (3 until measured). */
export const weekMaxColumns = (columnWidth?: number) =>
  columnWidth === undefined ? 3 : Math.max(2, Math.min(3, Math.floor(columnWidth / 75)));

/** Columns per cluster in the day view. */
export const DAY_MAX_COLUMNS = 4;

// Horizontal position of `span` columns out of `columns`, leaving `inset` px on each side and a 2px gap.
function horizontal(column: number, span: number, columns: number, inset: number) {
  return inset
    ? { left: `calc(${inset}px + (100% - ${2 * inset}px) * ${column / columns})`, width: `calc((100% - ${2 * inset}px) * ${span / columns} - 2px)` }
    : { left: `${(column / columns) * 100}%`, width: `calc(${(span / columns) * 100}% - 2px)` };
}

/**
 * The events of one day column of the week or day view: overlapping events side by side, each one
 * stretching right while the next column is free, and the events past `maxColumns` behind "+N".
 */
export const TimeGridEvents: React.FC<TimeGridEventsProps> = ({
  dayKey, segments, grid, hourHeight, maxColumns, columnWidth, inset = 0, timezone, locale, readonly, onEventClick, onEventContextMenu, onEventResize, onMoreClick, highlightId, ghost, translations,
}) => {
  const { blocks, more } = layoutColumns(segments, maxColumns);
  return (
  <>
    {blocks.map(({ event, start, end, column, span, columns }) => {
      const zonedStart = toDisplay(event.start, timezone);
      const zonedEnd = toDisplay(event.end, timezone);
      const height = Math.max((differenceInMinutes(end, start) / 60) * hourHeight, 12);
      // Only the segment holding the event's real end can be resized.
      const isLastSegment = end.getTime() === zonedEnd.getTime();
      const width = columnWidth === undefined ? undefined : ((columnWidth - 2 * inset) * span) / columns - 2;
      return (
        <DraggableEvent
          key={`${event.id}-${dayKey}`}
          dragId={`${event.id}@${dayKey}`}
          grabOffsetMs={start.getTime() - zonedStart.getTime()}
          event={event}
          // Reversed: a resize grows the block from its bottom (its start) upward.
          className={cx("ck:absolute ck:z-10", grid.reverse && "ck:flex ck:flex-col ck:justify-end")}
          style={{ ...gridOffset(grid, minutesOf(start), hourHeight), height: `${height}px`, ...horizontal(column, span, columns, inset) }}
        >
          <ResizableEvent
            readonly={readonly || !isLastSegment}
            event={event}
            hourHeight={hourHeight}
            snapMinutes={grid.slotMinutes}
            reverse={grid.reverse}
            onResize={onEventResize}
            className="ck:h-full"
            style={{ height: '100%' }}
          >
            <EventBlock
              event={event}
              height={height}
              width={width}
              timezone={timezone}
              locale={locale}
              highlight={event.id === highlightId}
              className={readonly || isEventDragDisabled(event) ? "ck:cursor-default" : "ck:cursor-grab ck:active:cursor-grabbing"}
              onClick={onEventClick}
              onContextMenu={onEventContextMenu}
            />
          </ResizableEvent>
        </DraggableEvent>
      );
    })}
    {more.map(({ segments: hidden, column, columns, start, end }) => (
      <button
        key={`more-${start.getTime()}`}
        type="button"
        className="ck:absolute ck:z-10 ck:flex ck:items-start ck:justify-center ck:pt-1 ck:rounded-md ck:bg-muted ck:hover:bg-accent ck:text-xs ck:font-semibold ck:text-foreground ck:tabular-nums ck:transition-colors"
        style={{
          ...gridOffset(grid, minutesOf(start), hourHeight),
          height: `${Math.max((differenceInMinutes(end, start) / 60) * hourHeight, 20)}px`,
          ...horizontal(column, 1, columns, inset),
        }}
        aria-label={interpolate(translations?.moreEvents || '+{n} more', { n: hidden.length })}
        onClick={(e) => {
          e.stopPropagation();
          onMoreClick?.(hidden.map((segment) => segment.event));
        }}
      >
        +{hidden.length}
      </button>
    ))}
    {ghost && (
      <div
        aria-hidden="true"
        data-ck-ghost
        className="ck:absolute ck:z-20 ck:pointer-events-none ck:rounded-md ck:bg-primary ck:text-primary-foreground ck:shadow-[0_8px_20px_-6px_rgb(0_0_0/0.4)] ck:px-2 ck:py-1 ck:text-xs ck:leading-tight ck:overflow-hidden"
        style={{
          ...gridOffset(grid, minutesOf(ghost.start), hourHeight),
          height: `${Math.max((differenceInMinutes(ghost.end, ghost.start) / 60) * hourHeight, 12)}px`,
          ...horizontal(0, 1, 1, inset),
        }}
      >
        <span className="ck:block ck:truncate ck:font-semibold">{ghost.title || translations?.noTitle || '(No title)'}</span>
        <span className="ck:block ck:truncate ck:opacity-90 ck:tabular-nums">{format(ghost.start, timeFormats(locale).time, { locale })} – {format(ghost.end, timeFormats(locale).time, { locale })}</span>
      </div>
    )}
  </>
  );
};
