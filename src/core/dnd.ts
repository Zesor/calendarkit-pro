import { addDays, differenceInCalendarDays, startOfDay } from 'date-fns'
import type { CalendarEvent, ViewType } from '../types'
import { dayEventSpan } from './allDay'
import { fromDisplay, toDisplay } from './timezone'

export interface DropInput {
  event: CalendarEvent
  /** Wall-clock date of the drop target, as built by the grid (day cell or time slot). */
  overDate: Date
  overResourceId?: string
  /**
   * Wall-clock ms between the event's start and the start of the block that was grabbed
   * (non-zero for the second-day block of an event crossing midnight).
   */
  grabOffsetMs?: number
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
export function computeDrop({ event, overDate, overResourceId, grabOffsetMs = 0, view, tz }: DropInput): DropResult | null {
  let wallStart: Date
  if (view === 'month') {
    const original = toDisplay(event.start, tz)
    wallStart = new Date(overDate)
    wallStart.setHours(original.getHours(), original.getMinutes(), original.getSeconds(), original.getMilliseconds())
  } else {
    wallStart = new Date(overDate.getTime() - grabOffsetMs)
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

/** Shifts an instant by whole calendar days: local dates for all-day events, display wall time otherwise. */
const shiftDays = (date: Date, days: number, event: CalendarEvent, tz?: string) =>
  event.allDay ? addDays(date, days) : fromDisplay(addDays(toDisplay(date, tz), days), tz)

/**
 * Moves an all-day-row event so that the grabbed day (`grabDayOffset` days after its first day)
 * lands on `overDay`. Keeps the duration; `null` when nothing changes.
 */
export function computeDayMove(event: CalendarEvent, overDay: Date, grabDayOffset: number, tz?: string): { start: Date; end: Date } | null {
  const { firstDay } = dayEventSpan(event, tz)
  const days = differenceInCalendarDays(addDays(startOfDay(overDay), -grabDayOffset), firstDay)
  if (days === 0) return null
  return { start: shiftDays(event.start, days, event, tz), end: shiftDays(event.end, days, event, tz) }
}

/**
 * New end after stretching the right edge to `newLastDay` (at least the first day). All-day events
 * get an exclusive end (midnight after the last day); long timed events keep their end time.
 */
export function computeDayResize(event: CalendarEvent, newLastDay: Date, tz?: string): Date | null {
  const { firstDay, lastDay } = dayEventSpan(event, tz)
  const target = startOfDay(newLastDay) < firstDay ? firstDay : startOfDay(newLastDay)
  const days = differenceInCalendarDays(target, lastDay)
  if (days === 0) return null
  return event.allDay ? addDays(target, 1) : shiftDays(event.end, days, event, tz)
}
