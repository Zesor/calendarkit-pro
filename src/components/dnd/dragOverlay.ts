import { differenceInMinutes } from 'date-fns';
import type { CalendarEvent, ViewType } from '../../types';

/** Size of the drag ghost. All-day bars keep the size of the dragged bar (dnd-kit's default). */
export function dragOverlaySize(view: ViewType, event: CalendarEvent, isDayDrag: boolean): { width?: string; height?: number } {
  if (isDayDrag) return {};
  const minutes = differenceInMinutes(event.end, event.start);
  if (view === 'month') return { width: '100%' };
  if (view === 'resource') return { width: `${Math.max((minutes / 60) * 100, 4)}px`, height: 80 }; // 100 px per hour
  if (view === 'week' || view === 'day') return { width: '150px', height: (minutes / 60) * (view === 'day' ? 80 : 60) };
  return { width: '150px' };
}
