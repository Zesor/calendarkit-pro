import React, { useRef, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { addDays, differenceInCalendarDays, format } from 'date-fns';
import { CalendarEvent } from '../types';
import { cx, isEventDragDisabled, isEventResizeDisabled } from '../utils';
import { useClassNames, useComponents } from './customize';
import { dayEventSpan, DaySpanSegment } from '../core/allDay';
import { useEventLabel } from './eventLabel';
import { useEventColorStyle } from './eventColor';

interface AllDayBarProps {
  segment: DaySpanSegment;
  /** Days of the row the bar is drawn in (one week, or one day). */
  rowDays: Date[];
  laneHeight: number;
  timezone?: string;
  readonly?: boolean;
  onEventClick?: (event: CalendarEvent) => void;
  onEventContextMenu?: (event: CalendarEvent, e: React.MouseEvent) => void;
  onDayEventResize?: (event: CalendarEvent, newLastDay: Date) => void;
}

const AllDayBarImpl: React.FC<AllDayBarProps> = ({
  segment,
  rowDays,
  laneHeight,
  timezone,
  readonly,
  onEventClick,
  onEventContextMenu,
  onDayEventResize,
}) => {
  const classNames = useClassNames();
  const { EventContent } = useComponents();
  const { event, startCol, span, lane, continuesBefore, continuesAfter } = segment;
  const columns = rowDays.length;
  const { firstDay } = dayEventSpan(event, timezone);
  // Days of the event hidden before this row (bars continued from a previous week).
  const segmentOffset = differenceInCalendarDays(rowDays[startCol], firstDay);

  // The drag data is read when the drag ends: the grabbed day is filled in on pointer down.
  const dragData = useRef({ event, grabDayOffset: segmentOffset });
  dragData.current.event = event;
  const dragDisabled = readonly || isEventDragDisabled(event);
  // Pointer drag only: the wrapper is not a tab stop, the bar button inside it is (spec §8.8).
  const { listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${event.id}@day@${format(rowDays[0], 'yyyy-MM-dd')}`,
    data: dragData.current,
    disabled: dragDisabled,
  });

  const [resizeCols, setResizeCols] = useState(0);
  // The click that follows a stretch (pointer released over the bar) must not open the event.
  const ignoreClick = useRef(false);
  const canResize = !readonly && !continuesAfter && !isEventResizeDisabled(event) && !!onDayEventResize;
  const shownSpan = Math.max(1, Math.min(span + resizeCols, columns - startCol));

  const handlePointerDownCapture = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const dayWithin = rect.width > 0 ? Math.floor(((e.clientX - rect.left) / rect.width) * span) : 0;
    dragData.current.grabDayOffset = segmentOffset + Math.min(Math.max(dayWithin, 0), span - 1);
  };

  const handleResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const bar = e.currentTarget.parentElement as HTMLElement;
    const columnWidth = bar.getBoundingClientRect().width / span || 1;
    const startX = e.clientX;
    let delta = 0;
    const onMove = (moveEvent: PointerEvent) => {
      delta = Math.round((moveEvent.clientX - startX) / columnWidth);
      setResizeCols(delta);
    };
    const stop = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', stop);
      setResizeCols(0);
    };
    const onUp = () => {
      stop();
      ignoreClick.current = true;
      setTimeout(() => { ignoreClick.current = false; }, 0);
      if (delta !== 0) onDayEventResize?.(event, addDays(rowDays[startCol + span - 1], delta));
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', stop);
  };

  const colorStyle = useEventColorStyle(event);
  const label = useEventLabel()(event);

  return (
    <div
      ref={setNodeRef}
      data-ck-drag=""
      {...listeners}
      onPointerDownCapture={handlePointerDownCapture}
      className={cx(
        "ck:group ck:absolute ck:px-[2px] ck:select-none",
        dragDisabled ? "ck:cursor-pointer" : "ck:cursor-grab ck:active:cursor-grabbing ck:touch-none"
      )}
      style={{
        left: `${(startCol / columns) * 100}%`,
        width: `${(shownSpan / columns) * 100}%`,
        top: lane * laneHeight,
        height: laneHeight,
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0 : undefined,
        zIndex: isDragging ? 100 : 1,
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (ignoreClick.current) {
          ignoreClick.current = false;
          return;
        }
        onEventClick?.(event);
      }}
      onContextMenu={onEventContextMenu ? (e) => onEventContextMenu(event, e) : undefined}
    >
      <button
        type="button"
        aria-label={label}
        className={cx(
          "ck-event ck-event-bar ck:w-full ck:text-left ck:relative ck:h-[calc(100%-4px)] ck:mt-[2px] ck:flex ck:items-center ck:gap-1 ck:px-1.5 ck:text-[11px] ck:font-semibold ck:overflow-hidden",
          continuesBefore ? "ck:rounded-l-none" : "ck:rounded-l-md",
          continuesAfter ? "ck:rounded-r-none" : "ck:rounded-r-md",
          classNames.event,
          classNames.allDayBar
        )}
        style={colorStyle}
        data-ck-event-id={event.id}
      >
        {continuesBefore && <span aria-hidden="true">‹</span>}
        {EventContent ? <EventContent event={event} variant="bar" /> : <span className="ck:truncate">{event.title}</span>}
        {continuesAfter && <span className="ck:ml-auto" aria-hidden="true">›</span>}
        {canResize && (
          <div
            data-testid="all-day-resize"
            className="ck:absolute ck:right-0 ck:top-0 ck:bottom-0 ck:w-1.5 ck:cursor-ew-resize ck:opacity-0 ck:group-hover:opacity-100 ck:bg-black/20"
            onPointerDown={handleResizeStart}
          />
        )}
      </button>
    </div>
  );
};

export const AllDayBar = React.memo(AllDayBarImpl);
