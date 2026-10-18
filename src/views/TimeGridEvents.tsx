import React from 'react';
import { differenceInMinutes, Locale } from 'date-fns';
import { CalendarEvent } from '../types';
import { isEventDragDisabled } from '../utils';
import { DaySegment } from '../core/events';
import { layoutDayEvents } from '../core/layout';
import { toDisplay } from '../core/timezone';
import { DraggableEvent } from '../components/dnd/DraggableEvent';
import { ResizableEvent } from '../components/dnd/ResizableEvent';
import { EventBlock } from '../components/EventBlock';

interface TimeGridEventsProps {
  dayKey: string;
  /** The day's timed segments (wall clock in the display zone). */
  segments: DaySegment[];
  hourHeight: number;
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
}

/** The events of one day column of the week or day view, positioned, draggable and resizable. */
export const TimeGridEvents: React.FC<TimeGridEventsProps> = ({
  dayKey, segments, hourHeight, columnWidth, inset = 0, timezone, locale, readonly, onEventClick, onEventContextMenu, onEventResize,
}) => (
  <>
    {layoutDayEvents(segments).map(({ event, start, end, column, columns }) => {
      const zonedStart = toDisplay(event.start, timezone);
      const zonedEnd = toDisplay(event.end, timezone);
      const top = ((start.getHours() * 60 + start.getMinutes()) / 60) * hourHeight;
      const height = Math.max((differenceInMinutes(end, start) / 60) * hourHeight, 12);
      // Only the segment holding the event's real end can be resized.
      const isLastSegment = end.getTime() === zonedEnd.getTime();
      const width = columnWidth === undefined ? undefined : (columnWidth - 2 * inset) / columns - 2;
      // Overlapping blocks share the column, with a 2px gap.
      const left = inset ? `calc(${inset}px + (100% - ${2 * inset}px) * ${column / columns})` : `${(column / columns) * 100}%`;
      return (
        <DraggableEvent
          key={`${event.id}-${dayKey}`}
          dragId={`${event.id}@${dayKey}`}
          grabOffsetMs={start.getTime() - zonedStart.getTime()}
          event={event}
          className="ck:absolute ck:z-10"
          style={{
            top: `${top}px`,
            height: `${height}px`,
            left,
            width: inset ? `calc((100% - ${2 * inset}px) * ${1 / columns} - 2px)` : `calc(${100 / columns}% - 2px)`,
          }}
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
              className={readonly || isEventDragDisabled(event) ? "ck:cursor-default" : "ck:cursor-grab ck:active:cursor-grabbing"}
              onClick={onEventClick}
              onContextMenu={onEventContextMenu}
            />
          </ResizableEvent>
        </DraggableEvent>
      );
    })}
  </>
);
