import { addDays, format, startOfDay } from 'date-fns'
import type { CalendarEvent } from '../types'
import { toCalendarMidnight } from './allDay'
import { toDisplay } from './timezone'
import { warnOnce } from './warn'

type DateInput = Date | string | number

const toDate = (value: DateInput | undefined): Date | undefined =>
  value === undefined || value === null ? undefined : value instanceof Date ? value : new Date(value)

const isValidDate = (date: Date | undefined): date is Date => !!date && !Number.isNaN(date.getTime())

const normalizedEvent = new WeakMap<CalendarEvent, CalendarEvent | null>()
const normalizedList = new WeakMap<CalendarEvent[], CalendarEvent[]>()

function normalizeEvent(event: CalendarEvent): CalendarEvent | null {
  const cached = normalizedEvent.get(event)
  if (cached !== undefined) return cached

  // All-day dates given as date-only values (UTC midnight) become local midnights once, so moving,
  // repeating and displaying them never drifts across DST or timezones.
  const day = (value: Date | undefined) => (event.allDay && value ? toCalendarMidnight(value) : value)
  const start = day(toDate(event.start as DateInput))
  const end = day(toDate(event.end as DateInput))
  let result: CalendarEvent | null = null
  if (!isValidDate(start) || !isValidDate(end)) {
    warnOnce(`invalid-date:${event.id}`, `Event "${event.id}" has an invalid start or end date and was skipped.`)
  } else if (end.getTime() < start.getTime()) {
    warnOnce(`end-before-start:${event.id}`, `Event "${event.id}" ends before it starts and was skipped.`)
  } else {
    const needsCopy = start !== event.start || end !== event.end || needsRecurrenceCopy(event) || (!!event.allDay && dateOnlyRecurrence(event))
    result = needsCopy
      ? {
          ...event,
          start,
          end,
          recurrence: event.recurrence && {
            ...event.recurrence,
            until: day(toDate(event.recurrence.until as DateInput | undefined)),
            exdates: event.recurrence.exdates?.map((d) => day(toDate(d as DateInput)) as Date),
          },
        }
      : event
  }
  normalizedEvent.set(event, result)
  return result
}

function dateOnlyRecurrence(event: CalendarEvent): boolean {
  const r = event.recurrence
  const changes = (d: unknown) => d instanceof Date && toCalendarMidnight(d) !== d
  return !!r && (changes(r.until) || !!r.exdates?.some(changes))
}

function needsRecurrenceCopy(event: CalendarEvent): boolean {
  const r = event.recurrence
  if (!r) return false
  return (r.until !== undefined && !(r.until instanceof Date)) || !!r.exdates?.some((d) => !(d instanceof Date))
}

/**
 * Coerces string/number dates to `Date` and drops invalid events (bad date, end before start)
 * with a development warning; duplicate ids are kept but warned about. Cached per input array
 * and per event: events are treated as immutable (create a new object to change one).
 */
export function normalizeEvents(events: CalendarEvent[]): CalendarEvent[] {
  const cached = normalizedList.get(events)
  if (cached) return cached
  const seen = new Set<string>()
  const result: CalendarEvent[] = []
  for (const event of events) {
    const normalized = normalizeEvent(event)
    if (!normalized) continue
    // Duplicates are still rendered (1.x behaviour) but break drag & drop and React keys: warn.
    if (seen.has(normalized.id)) {
      warnOnce(`duplicate-id:${normalized.id}`, `Duplicate event id "${normalized.id}": ids must be unique.`)
    }
    seen.add(normalized.id)
    result.push(normalized)
  }
  normalizedList.set(events, result)
  return result
}

const dayKey = (wall: Date) => format(wall, 'yyyy-MM-dd')

function memoByZone<T>(cache: WeakMap<CalendarEvent[], Map<string, T>>, events: CalendarEvent[], tz: string | undefined, compute: () => T): T {
  let byZone = cache.get(events)
  if (!byZone) {
    byZone = new Map()
    cache.set(events, byZone)
  }
  const key = tz ?? ''
  let value = byZone.get(key)
  if (value === undefined) {
    value = compute()
    byZone.set(key, value)
  }
  return value
}

const startDayCache = new WeakMap<CalendarEvent[], Map<string, Map<string, CalendarEvent[]>>>()

/** Events grouped by the display day they start on (`yyyy-MM-dd`), in input order. Cached per (array, zone). */
export function eventsByStartDay(events: CalendarEvent[], tz?: string): Map<string, CalendarEvent[]> {
  return memoByZone(startDayCache, events, tz, () => {
    const map = new Map<string, CalendarEvent[]>()
    for (const event of events) {
      const key = dayKey(toDisplay(event.start, tz))
      const bucket = map.get(key)
      if (bucket) bucket.push(event)
      else map.set(key, [event])
    }
    return map
  })
}

/** Part of an event that falls on one display day, in wall-clock time. */
export interface DaySegment {
  event: CalendarEvent
  start: Date
  end: Date
}

/** Wall-clock day range [start, end) to build segments for. */
export interface DayRange {
  start: Date
  end: Date
}

const segmentCache = new WeakMap<CalendarEvent[], Map<string, Map<string, DaySegment[]>>>()

/**
 * Splits each event at display midnight (T4): an event from 22:00 to 02:00 yields one segment
 * per day it covers. Keys are `yyyy-MM-dd`. Pass the visible `range` so very long events only
 * produce the days on screen. Cached per (array, zone, range), so each day's array is
 * referentially stable while those do not change.
 */
export function segmentsByDisplayDay(events: CalendarEvent[], tz?: string, range?: DayRange): Map<string, DaySegment[]> {
  const cacheKey = range ? `${tz ?? ''}|${range.start.getTime()}|${range.end.getTime()}` : tz
  return memoByZone(segmentCache, events, cacheKey, () => {
    const map = new Map<string, DaySegment[]>()
    for (const event of events) {
      const wallStart = toDisplay(event.start, tz)
      // In a DST fall-back hour the wall end can precede the wall start: keep the event visible.
      const rawEnd = toDisplay(event.end, tz)
      const wallEnd = rawEnd < wallStart ? wallStart : rawEnd
      if (range && (wallEnd < range.start || wallStart >= range.end)) continue
      let day = startOfDay(range && wallStart < range.start ? range.start : wallStart)
      const stop = range && wallEnd > range.end ? range.end : wallEnd
      do {
        const next = addDays(day, 1)
        const start = wallStart > day ? wallStart : day
        const end = wallEnd < next ? wallEnd : next
        if (end > start || wallStart.getTime() === wallEnd.getTime()) {
          const key = dayKey(day)
          const bucket = map.get(key)
          const segment = { event, start, end }
          if (bucket) bucket.push(segment)
          else map.set(key, [segment])
        }
        day = next
      } while (day < stop)
    }
    return map
  })
}
