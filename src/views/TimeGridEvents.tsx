import React from 'react';
import { differenceInMinutes, Locale } from 'date-fns';
import { CalendarEvent, CalendarTranslations } from '../types';
import { isEventDragDisabled } from '../utils';
import { DaySegment } from '../core/events';
import { interpolate } from '../core/format';
import { layoutColumns } from '../core/overlap';
import { toDisplay } from '../core/timezone';
import { DraggableEvent } from '../components/dnd/DraggableEvent';
import { ResizableEvent } from '../components/dnd/ResizableEvent';
import { EventBlock } from '../components/EventBlock';

interface TimeGridEventsProps {
  dayKey: string;
  /** The day's timed segments (wall clock in the display zone). */
  segments: DaySegment[];
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
  dayKey, segments, hourHeight, maxColumns, columnWidth, inset = 0, timezone, locale, readonly, onEventClick, onEventContextMenu, onEventResize, onMoreClick, highlightId, ghost, translations,
}) => {
  const { blocks, more } = layoutColumns(segments, maxColumns);
  return (
  <>
    {blocks.map(({ event, start, end, column, span, columns }) => {
      const zonedStart = toDisplay(event.start, timezone);
      const zonedEnd = toDisplay(event.end, timezone);
      const top = (minutesOf(start) / 60) * hourHeight;
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
          className="ck:absolute ck:z-10"
          style={{ top: `${top}px`, height: `${height}px`, ...horizontal(column, span, columns, inset) }}
        >
          <ResizableEvent
            readonly={readonly || !isLastSegment}
            event={event}
            hourHeight={hourHeight}
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
          top: `${(minutesOf(start) / 60) * hourHeight}px`,
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
        className="ck-event ck:absolute ck:z-20 ck:pointer-events-none ck:rounded-md ck:outline-2 ck:outline-dashed ck:outline-ring ck:-outline-offset-2 ck:px-2 ck:py-1 ck:text-xs ck:font-semibold ck:leading-tight ck:overflow-hidden"
        style={{
          top: `${(minutesOf(ghost.start) / 60) * hourHeight}px`,
          height: `${Math.max((differenceInMinutes(ghost.end, ghost.start) / 60) * hourHeight, 12)}px`,
          ...horizontal(0, 1, 1, inset),
        }}
      >
        <span className="ck:block ck:truncate">{ghost.title || translations?.newEvent || 'New event'}</span>
      </div>
    )}
  </>
  );
};
