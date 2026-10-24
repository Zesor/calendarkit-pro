import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { CalendarEvent } from '../../types';
import { cx, isEventDragDisabled } from '../../utils';

interface DraggableEventProps extends React.HTMLAttributes<HTMLDivElement> {
  event: CalendarEvent;
  /** Unique drag id when one event renders several blocks (e.g. one per day). Defaults to `event.id`. */
  dragId?: string;
  /** Wall-clock ms from the event start to this block's start (blocks after midnight). */
  grabOffsetMs?: number;
  children: React.ReactNode;
}

const DraggableEventImpl: React.FC<DraggableEventProps> = ({ event, dragId, grabOffsetMs, children, className, style: propStyle, ...props }) => {
  const dragDisabled = isEventDragDisabled(event);
  // Pointer drag only: the wrapper is not a tab stop, the event button inside it is (spec §8.8).
  const { listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId ?? event.id,
    data: { event, grabOffsetMs },
    disabled: dragDisabled,
  });

  const style = {
    ...propStyle,
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 100 : propStyle?.zIndex,
    // Hide the original while dragging: the DragOverlay ghost is what the user follows.
    opacity: isDragging ? 0 : propStyle?.opacity,
  };

  return (
    <div
      ref={setNodeRef}
      data-ck-drag=""
      style={style}
      {...listeners}
      {...props}
      className={cx(!dragDisabled && "ck:touch-none", className)}
    >
      {children}
    </div>
  );
};

// C6: avoid re-rendering every event block when the scheduler re-renders (e.g. during a drag).
export const DraggableEvent = React.memo(DraggableEventImpl);
