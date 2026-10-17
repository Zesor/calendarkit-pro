// All-day and multi-day events. The lane-packing algorithm is ported from PR #1 by @HannanSolo.
import { addDays, differenceInCalendarDays, startOfDay } from 'date-fns'
import type { CalendarEvent } from '../types'
import { toDisplay } from './timezone'

/** Timed events lasting at least this long are shown with the all-day events. */
const DAY_EVENT_MIN_MS = 24 * 60 * 60 * 1000

/** Whether the event belongs to the all-day row: `allDay`, or a timed event of 24 h or more. */
export function isDayEvent(event: CalendarEvent): boolean {
  return event.allDay === true || event.end.getTime() - event.start.getTime() >= DAY_EVENT_MIN_MS
}

const isMidnight = (date: Date) =>
  date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0 && date.getMilliseconds() === 0

const isUtcMidnight = (date: Date) =>
  date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0

/**
 * Local midnight of the same calendar date for a date-only value parsed as UTC midnight
 * (`new Date('2026-10-12')`); any other value is returned unchanged.
 */
export function toCalendarMidnight(date: Date): Date {
  return !isMidnight(date) && isUtcMidnight(date) ? new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) : date
}

// Calendar day of an all-day boundary. Date-only values parsed as UTC midnight
// (`new Date('2026-10-12')`) keep their date in every zone.
function calendarDay(date: Date): { day: Date; midnight: boolean } {
  if (isMidnight(date)) return { day: startOfDay(date), midnight: true }
  if (isUtcMidnight(date)) return { day: new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()), midnight: true }
  return { day: startOfDay(date), midnight: false }
}

/**
 * First and last day covered (wall-clock midnights). All-day events are calendar dates: read in
 * local time (or as UTC dates for date-only values), never shifted by the display zone, with an
 * exclusive end (an `end` at midnight means the previous day; `end <= start` means one day).
 * Long timed events follow the display zone.
 */
export function dayEventSpan(event: CalendarEvent, tz?: string): { firstDay: Date; lastDay: Date } {
  if (event.allDay) {
    const firstDay = calendarDay(event.start).day
    if (event.end.getTime() <= event.start.getTime()) return { firstDay, lastDay: firstDay }
    const end = calendarDay(event.end)
    const lastDay = end.midnight ? addDays(end.day, -1) : end.day
    return { firstDay, lastDay: lastDay < firstDay ? firstDay : lastDay }
  }
  const firstDay = startOfDay(toDisplay(event.start, tz))
  const lastDay = startOfDay(toDisplay(new Date(event.end.getTime() - 1), tz))
  return { firstDay, lastDay: lastDay < firstDay ? firstDay : lastDay }
}

const partitionCache = new WeakMap<CalendarEvent[], Map<string, { dayEvents: CalendarEvent[]; timedEvents: CalendarEvent[] }>>()

/** Splits events into all-day-row events and grid events, cached per (array, zone). */
export function partitionDayEvents(events: CalendarEvent[], tz?: string): { dayEvents: CalendarEvent[]; timedEvents: CalendarEvent[] } {
  let byZone = partitionCache.get(events)
  if (!byZone) {
    byZone = new Map()
    partitionCache.set(events, byZone)
  }
  const key = tz ?? ''
  let result = byZone.get(key)
  if (!result) {
    const dayEvents: CalendarEvent[] = []
    const timedEvents: CalendarEvent[] = []
    for (const event of events) (isDayEvent(event) ? dayEvents : timedEvents).push(event)
    result = { dayEvents, timedEvents }
    byZone.set(key, result)
  }
  return result
}

export interface DaySpanSegment {
  event: CalendarEvent
  /** First column (0-based) of the segment in the row. */
  startCol: number
  /** Number of columns covered. */
  span: number
  lane: number
  /** The event started before this row. */
  continuesBefore: boolean
  /** The event goes on after this row. */
  continuesAfter: boolean
}

export interface DayRowLayout {
  segments: DaySpanSegment[]
  laneCount: number
}

const rowCache = new WeakMap<CalendarEvent[], Map<string, DayRowLayout>>()

/** Lane-packed segments of `dayEvents` for a row of consecutive days (a week, or a single day). */
export function layoutDayRow(days: Date[], dayEvents: CalendarEvent[], tz?: string): DayRowLayout {
  if (days.length === 0) return { segments: [], laneCount: 0 }
  const rowStart = startOfDay(days[0])
  const columns = days.length
  const key = `${tz ?? ''}|${rowStart.getTime()}|${columns}`
  let cache = rowCache.get(dayEvents)
  if (!cache) {
    cache = new Map()
    rowCache.set(dayEvents, cache)
  }
  const cached = cache.get(key)
  if (cached) return cached

  const unplaced: Omit<DaySpanSegment, 'lane'>[] = []
  for (const event of dayEvents) {
    const { firstDay, lastDay } = dayEventSpan(event, tz)
    const first = differenceInCalendarDays(firstDay, rowStart)
    const last = differenceInCalendarDays(lastDay, rowStart)
    if (last < 0 || first >= columns) continue
    const startCol = Math.max(first, 0)
    const endCol = Math.min(last, columns - 1)
    unplaced.push({ event, startCol, span: endCol - startCol + 1, continuesBefore: first < 0, continuesAfter: last >= columns })
  }

  // Earlier start first, then longer first, then id for a stable order.
  unplaced.sort((a, b) => a.startCol - b.startCol || b.span - a.span || (a.event.id < b.event.id ? -1 : a.event.id > b.event.id ? 1 : 0))

  const occupied: boolean[][] = []
  const segments: DaySpanSegment[] = []
  for (const segment of unplaced) {
    let lane = occupied.findIndex((row) => row.slice(segment.startCol, segment.startCol + segment.span).every((taken) => !taken))
    if (lane === -1) {
      lane = occupied.length
      occupied.push(new Array<boolean>(columns).fill(false))
    }
    for (let c = segment.startCol; c < segment.startCol + segment.span; c++) occupied[lane][c] = true
    segments.push({ ...segment, lane })
  }

  const layout = { segments, laneCount: occupied.length }
  cache.set(key, layout)
  return layout
}
