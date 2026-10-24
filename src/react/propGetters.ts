import type React from 'react'
import type { CalendarEvent, CalendarStore } from 'calendarkit-pro/core'

export interface EventProps {
  type: 'button'
  'aria-label': string
  'data-event-id': string
  'data-all-day'?: 'true'
  'data-continues'?: 'before' | 'after' | 'both'
  onClick: (e: React.MouseEvent) => void
  onContextMenu?: (e: React.MouseEvent) => void
}

export interface SlotProps {
  type: 'button'
  'aria-label': string
  'aria-disabled'?: true
  onClick?: (e: React.MouseEvent) => void
}

export interface ResizeHandleProps {
  'aria-hidden': true
  onPointerDown: (e: React.PointerEvent) => void
}

/**
 * Props for an event element: a native button that opens the event, with its full accessible
 * name (pass `label`, e.g. "Review, Wednesday 14 October, 10:00 to 11:45", or the title is used).
 */
export function getEventProps(
  calendar: CalendarStore,
  event: CalendarEvent,
  options: { label?: string; onClick?: (event: CalendarEvent) => void; onContextMenu?: (event: CalendarEvent, e: React.MouseEvent) => void; continuesBefore?: boolean; continuesAfter?: boolean } = {},
): EventProps {
  const { continuesBefore, continuesAfter } = options
  const readOnly = calendar.getState().readOnly
  return {
    type: 'button',
    'aria-label': options.label ?? event.title,
    'data-event-id': event.id,
    ...(event.allDay ? { 'data-all-day': 'true' as const } : {}),
    ...(continuesBefore || continuesAfter ? { 'data-continues': continuesBefore && continuesAfter ? ('both' as const) : continuesBefore ? ('before' as const) : ('after' as const) } : {}),
    onClick: (e) => {
      e.stopPropagation()
      options.onClick?.(event)
      calendar.openEvent(event.id)
    },
    ...(options.onContextMenu && !readOnly ? { onContextMenu: (e: React.MouseEvent) => options.onContextMenu!(event, e) } : {}),
  }
}

/**
 * Props for an empty slot: a native button that opens the event form at `date` (wall-clock time of
 * the display timezone). Disabled in `readOnly`.
 */
export function getSlotProps(calendar: CalendarStore, date: Date, options: { label?: string; allDay?: boolean; resourceId?: string; editor?: boolean } = {}): SlotProps {
  const label = options.label ?? `New event ${date.toLocaleString()}`
  if (calendar.getState().readOnly) return { type: 'button', 'aria-label': label, 'aria-disabled': true }
  return {
    type: 'button',
    'aria-label': label,
    onClick: (e) => {
      e.stopPropagation()
      calendar.openSlot(date, { allDay: options.allDay, resourceId: options.resourceId, editor: options.editor })
    },
  }
}

/**
 * Props for the bottom edge of a timed event: dragging it changes the end time, snapped to
 * `snapMinutes`. `onPreview` receives the end being dragged (and `null` when the gesture ends) to
 * draw the block while resizing; a cancelled pointer changes nothing.
 */
export function getResizeHandleProps(
  calendar: CalendarStore,
  event: CalendarEvent,
  options: { pixelsPerMinute: number; snapMinutes?: number; onPreview?: (end: Date | null) => void },
): ResizeHandleProps {
  const snap = options.snapMinutes ?? 15
  return {
    'aria-hidden': true,
    onPointerDown: (down) => {
      if (calendar.getState().readOnly) return
      down.stopPropagation()
      down.preventDefault()
      const startY = down.clientY
      let end = event.end
      const endFor = (y: number) => {
        const minutes = Math.round((y - startY) / options.pixelsPerMinute / snap) * snap
        return new Date(Math.max(event.end.getTime() + minutes * 60000, event.start.getTime() + snap * 60000))
      }
      const move = (e: PointerEvent) => {
        end = endFor(e.clientY)
        options.onPreview?.(end)
      }
      const stop = () => {
        document.removeEventListener('pointermove', move)
        document.removeEventListener('pointerup', up)
        document.removeEventListener('pointercancel', cancel)
        options.onPreview?.(null)
      }
      const up = () => {
        stop()
        if (end.getTime() !== event.end.getTime()) calendar.resize(event.id, end)
      }
      const cancel = () => stop()
      document.addEventListener('pointermove', move)
      document.addEventListener('pointerup', up)
      document.addEventListener('pointercancel', cancel)
    },
  }
}
