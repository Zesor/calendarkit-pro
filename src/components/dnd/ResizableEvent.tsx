import React, { useState, useRef, useCallback } from 'react';
import { CalendarEvent } from '../../types';
import { cx, isEventResizeDisabled } from '../../utils';
import { computeResizeEnd } from '../../core/dnd';

interface ResizableEventProps {
  event: CalendarEvent;
  hourHeight: number;
  minDuration?: number; // Minimum duration in minutes
  /** The resize steps, in minutes (the grid's slot). */
  snapMinutes?: number;
  /** Reversed time axis: the end is the top edge, so the handle sits there and moves up to lengthen. */
  reverse?: boolean;
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
  snapMinutes = 15,
  reverse,
  onResize,
  children,
  className,
  style,
  readonly,
}) => {
  const resizeLocked = readonly || isEventResizeDisabled(event);
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
      const deltaY = (moveClientY - startYRef.current) * (reverse ? -1 : 1);

      const snapInterval = (hourHeight * snapMinutes) / 60;
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
        const minutesDiff = ((finalHeight - startHeightRef.current) / hourHeight) * 60;
        onResize(event, computeResizeEnd(event, minutesDiff, minDuration));
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
  }, [event, hourHeight, minDuration, snapMinutes, reverse, onResize]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // dnd-kit's PointerSensor activates on pointerdown, which mousedown's
    // stopPropagation doesn't reach — without this the whole-event drag
    // hijacks the resize gesture.
    e.stopPropagation();
  }, []);

  return (
    <div
      ref={containerRef}
      className={cx("ck:relative ck:group", className)}
      style={{
        ...style,
        height: resizeHeight !== null ? `${resizeHeight}px` : style?.height,
      }}
    >
      {children}

      {/* Resize Handle */}
      <div
        className={cx(
          resizeLocked ? "ck:cursor-default" : "ck:cursor-ns-resize ck:group-hover:opacity-100",
          "ck:absolute ck:left-0 ck:right-0 ck:h-3 ck:z-20 ck:flex ck:items-center ck:justify-center",
          reverse ? "ck:top-0" : "ck:bottom-0",
          "ck:transition-opacity",
          isResizing ? "ck:opacity-100" : "ck:opacity-0"
        )}
        onPointerDown={resizeLocked ? undefined : handlePointerDown}
        onMouseDown={resizeLocked ? undefined : handleResizeStart}
        onTouchStart={resizeLocked ? undefined : handleResizeStart}
      >
        <div className={cx(
          "ck:w-8 ck:h-1 ck:rounded-full ck:transition-all",
          isResizing ? "ck:bg-primary" : "ck:bg-muted-foreground/30 ck:group-hover:bg-primary/50"
        )} />
      </div>

      {/* Visual feedback during resize */}
      {isResizing && (
        <div className="ck:absolute ck:inset-0 ck:border-2 ck:border-primary ck:border-dashed ck:rounded-md ck:pointer-events-none ck:bg-primary/5" />
      )}
    </div>
  );
};
