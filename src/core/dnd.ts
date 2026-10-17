import type { CalendarEvent, ViewType } from '../types'
import { fromDisplay, toDisplay } from './timezone'

export interface DropInput {
  event: CalendarEvent
  /** Wall-clock date of the drop target, as built by the grid (day cell or time slot). */
  overDate: Date
  overResourceId?: string
  view: ViewType
  tz?: string
}

export interface DropResult {
  start: Date
  end: Date
  resourceId?: string
}

/**
 * D3: new dates for an event dropped on a cell. Month view keeps the event's wall-clock time and
 * changes its day; time grids take the slot time. Duration and (unless dropped on another
 * resource) `resourceId` are kept. Returns `null` when nothing changes.
 */
export function computeDrop({ event, overDate, overResourceId, view, tz }: DropInput): DropResult | null {
  let wallStart: Date
  if (view === 'month') {
    const original = toDisplay(event.start, tz)
    wallStart = new Date(overDate)
    wallStart.setHours(original.getHours(), original.getMinutes(), original.getSeconds(), original.getMilliseconds())
  } else {
    wallStart = new Date(overDate)
    wallStart.setSeconds(0, 0)
  }
  const start = fromDisplay(wallStart, tz)
  const end = new Date(start.getTime() + (event.end.getTime() - event.start.getTime()))
  const resourceId = overResourceId ?? event.resourceId
  if (start.getTime() === event.start.getTime() && resourceId === event.resourceId) return null
  return { start, end, resourceId }
}

/** New end after dragging the resize handle by `deltaMinutes`, never shorter than `minDuration`. */
export function computeResizeEnd(event: CalendarEvent, deltaMinutes: number, minDuration = 15): Date {
  const minEnd = event.start.getTime() + minDuration * 60_000
  return new Date(Math.max(event.end.getTime() + deltaMinutes * 60_000, minEnd))
}
