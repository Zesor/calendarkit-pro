import React, { useState, useRef, useCallback } from 'react';
import { CalendarEvent } from '../../types';
import { cn } from '../../utils';

interface ResizableEventProps {
  event: CalendarEvent;
  hourHeight: number;
  minDuration?: number; // Minimum duration in minutes
  onResize?: (event: CalendarEvent, newEnd: Date) => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  readonly?: boolean;
}

export const ResizableEvent: React.FC<ResizableEventProps> = ({
  event,
  hourHeight,
  minDuration = 15,
  onResize,
  children,
  className,
  style,
  readonly,
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHeight, setResizeHeight] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(0);
  // Mirrors resizeHeight so the mouseup handler (registered at mousedown)
  // reads the final value instead of the state captured in a stale closure.
  const resizeHeightRef = useRef<number | null>(null);

  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startYRef.current = clientY;
    startHeightRef.current = containerRef.current?.offsetHeight || 0;

    setIsResizing(true);

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const moveClientY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      const deltaY = moveClientY - startYRef.current;

      // Snap to 15-minute intervals
      const snapInterval = hourHeight / 4; // 15 minutes
      const snappedDelta = Math.round(deltaY / snapInterval) * snapInterval;

      const newHeight = Math.max(
        (minDuration / 60) * hourHeight, // Minimum height based on minDuration
        startHeightRef.current + snappedDelta
      );

      resizeHeightRef.current = newHeight;
      setResizeHeight(newHeight);
    };

    const handleEnd = () => {
      setIsResizing(false);

      const finalHeight = resizeHeightRef.current;

      if (finalHeight !== null && containerRef.current && onResize) {
        // Calculate new end time based on resize
        const originalHeight = startHeightRef.current;
        const heightDiff = finalHeight - originalHeight;
        const minutesDiff = (heightDiff / hourHeight) * 60;

        const newEnd = new Date(event.end);
        newEnd.setMinutes(newEnd.getMinutes() + minutesDiff);

        // Ensure new end is after start
        if (newEnd > event.start) {
          onResize(event, newEnd);
        }
      }

      resizeHeightRef.current = null;
      setResizeHeight(null);

      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
  }, [event, hourHeight, minDuration, onResize]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // dnd-kit's PointerSensor activates on pointerdown, which mousedown's
    // stopPropagation doesn't reach — without this the whole-event drag
    // hijacks the resize gesture.
    e.stopPropagation();
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("relative group", className)}
      style={{
        ...style,
        height: resizeHeight !== null ? `${resizeHeight}px` : style?.height,
      }}
    >
      {children}

      {/* Resize Handle */}
      <div
        className={cn(
          readonly ? "cursor-default" : "cursor-ns-resize group-hover:opacity-100",
          "absolute bottom-0 left-0 right-0 h-3 z-20 flex items-center justify-center",
          "opacity-0 transition-opacity",
          isResizing && "opacity-100"
        )}
        onPointerDown={readonly ? undefined : handlePointerDown}
        onMouseDown={readonly ? undefined : handleResizeStart}
        onTouchStart={readonly ? undefined : handleResizeStart}
      >
        <div className={cn(
          "w-8 h-1 rounded-full transition-all",
          isResizing ? "bg-primary" : "bg-muted-foreground/30 group-hover:bg-primary/50"
        )} />
      </div>

      {/* Visual feedback during resize */}
      {isResizing && (
        <div className="absolute inset-0 border-2 border-primary border-dashed rounded-md pointer-events-none bg-primary/5" />
      )}
    </div>
  );
};
