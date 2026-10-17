import { pointerWithin, rectIntersection, type CollisionDetection } from '@dnd-kit/core';
import { differenceInMinutes } from 'date-fns';
import type { CalendarEvent, ViewType } from '../../types';

/**
 * All-day bars move by "grabbed day → day under the pointer", so they target the cell under the
 * pointer; the overlay (left-aligned with the bar) would point at the wrong day. Timed events keep
 * dnd-kit's overlay-based detection.
 */
export const dayAwareCollision: CollisionDetection = (args) => {
  if (args.active.data.current?.grabDayOffset !== undefined) {
    const underPointer = pointerWithin(args);
    if (underPointer.length > 0) return underPointer;
  }
  return rectIntersection(args);
};

/** Size of the drag ghost. All-day bars keep the size of the dragged bar (dnd-kit's default). */
export function dragOverlaySize(view: ViewType, event: CalendarEvent, isDayDrag: boolean): { width?: string; height?: number } {
  if (isDayDrag) return {};
  const minutes = differenceInMinutes(event.end, event.start);
  if (view === 'month') return { width: '100%' };
  if (view === 'resource') return { width: `${Math.max((minutes / 60) * 100, 4)}px`, height: 80 }; // 100 px per hour
  if (view === 'week' || view === 'day') return { width: '150px', height: (minutes / 60) * (view === 'day' ? 80 : 60) };
  return { width: '150px' };
}
