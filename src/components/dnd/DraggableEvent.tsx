import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { CalendarEvent } from '../../types';
import { cn, isEventDragDisabled } from '../../utils';

interface DraggableEventProps extends React.HTMLAttributes<HTMLDivElement> {
  event: CalendarEvent;
  children: React.ReactNode;
}

export const DraggableEvent: React.FC<DraggableEventProps> = ({ event, children, className, style: propStyle, ...props }) => {
  const dragDisabled = isEventDragDisabled(event);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
    data: { event },
    disabled: dragDisabled,
  });

  const style = {
    ...propStyle,
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 100 : propStyle?.zIndex,
    // When dragging, we want the ORIGINAL element to be almost invisible (or fully invisible)
    // so that the DragOverlay (the "ghost") is the only thing the user focuses on.
    // If we set opacity: 0, it disappears. If 0.1, it's a faint placeholder.
    // The user asked for "Make the entire dragged item transparent". 
    // Usually this means the original item should be faded out while the drag overlay is moving.
    opacity: isDragging ? 0 : propStyle?.opacity, // Hiding original element completely
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      {...props}
      className={cn(!dragDisabled && "touch-none", className)}
    >
      {children}
    </div>
  );
};
