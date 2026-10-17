import { addDays, format, startOfDay } from 'date-fns'
import type { CalendarEvent } from '../types'
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

  const start = toDate(event.start as DateInput)
  const end = toDate(event.end as DateInput)
  let result: CalendarEvent | null = null
  if (!isValidDate(start) || !isValidDate(end)) {
    warnOnce(`invalid-date:${event.id}`, `Event "${event.id}" has an invalid start or end date and was skipped.`)
  } else if (end.getTime() < start.getTime()) {
    warnOnce(`end-before-start:${event.id}`, `Event "${event.id}" ends before it starts and was skipped.`)
  } else {
    const needsCopy = start !== event.start || end !== event.end || needsRecurrenceCopy(event)
    result = needsCopy
      ? {
          ...event,
          start,
          end,
          recurrence: event.recurrence && {
            ...event.recurrence,
            until: toDate(event.recurrence.until as DateInput | undefined),
            exdates: event.recurrence.exdates?.map((d) => toDate(d as DateInput) as Date),
          },
        }
      : event
  }
  normalizedEvent.set(event, result)
  return result
}

function needsRecurrenceCopy(event: CalendarEvent): boolean {
  const r = event.recurrence
  if (!r) return false
  return (r.until !== undefined && !(r.until instanceof Date)) || !!r.exdates?.some((d) => !(d instanceof Date))
}

/**
 * Coerces string/number dates to `Date` and drops invalid events (bad date, end before
 * start, duplicate id) with a development warning. Cached per input array and per event.
 */
export function normalizeEvents(events: CalendarEvent[]): CalendarEvent[] {
  const cached = normalizedList.get(events)
  if (cached) return cached
  const seen = new Set<string>()
  const result: CalendarEvent[] = []
  for (const event of events) {
    const normalized = normalizeEvent(event)
    if (!normalized) continue
    if (seen.has(normalized.id)) {
      warnOnce(`duplicate-id:${normalized.id}`, `Duplicate event id "${normalized.id}": only the first one is rendered.`)
      continue
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

const segmentCache = new WeakMap<CalendarEvent[], Map<string, Map<string, DaySegment[]>>>()

/**
 * Splits each event at display midnight (T4): an event from 22:00 to 02:00 yields one segment
 * per day it covers. Keys are `yyyy-MM-dd`. Cached per (array, zone), so each day's array is
 * referentially stable while the events and zone do not change.
 */
export function segmentsByDisplayDay(events: CalendarEvent[], tz?: string): Map<string, DaySegment[]> {
  return memoByZone(segmentCache, events, tz, () => {
    const map = new Map<string, DaySegment[]>()
    for (const event of events) {
      const wallStart = toDisplay(event.start, tz)
      const wallEnd = toDisplay(event.end, tz)
      let day = startOfDay(wallStart)
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
      } while (day < wallEnd)
    }
    return map
  })
}
