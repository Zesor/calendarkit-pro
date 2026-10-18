import { addMonths, startOfMonth } from 'date-fns'
import { RRule, Weekday } from 'rrule'
import type { CalendarEvent } from '../types'
import { fromDisplay, toDisplay } from './timezone'
import { warnOnce } from './warn'

export interface DateRange {
  start: Date
  end: Date
}

/** Recurrence weekday convention used by `CalendarEvent.recurrence.byweekday`: 0 = Monday … 6 = Sunday. */
const WEEKDAYS: Weekday[] = [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR, RRule.SA, RRule.SU]

// rrule computes in UTC. To keep the wall-clock time stable across DST changes (R3) we feed it
// "floating" dates whose UTC fields equal the wall clock in the anchor zone, then convert back.
const toFloating = (instant: Date, tz?: string): Date => {
  const w = toDisplay(instant, tz)
  return new Date(Date.UTC(w.getFullYear(), w.getMonth(), w.getDate(), w.getHours(), w.getMinutes(), w.getSeconds(), w.getMilliseconds()))
}
const fromFloating = (floating: Date, tz?: string): Date =>
  fromDisplay(
    new Date(
      floating.getUTCFullYear(), floating.getUTCMonth(), floating.getUTCDate(),
      floating.getUTCHours(), floating.getUTCMinutes(), floating.getUTCSeconds(), floating.getUTCMilliseconds(),
    ),
    tz,
  )

const minuteKey = (date: Date) => Math.floor(date.getTime() / 60_000)

const FREQUENCIES = { DAILY: RRule.DAILY, WEEKLY: RRule.WEEKLY, MONTHLY: RRule.MONTHLY, YEARLY: RRule.YEARLY }

function buildRule(event: CalendarEvent, tz?: string): RRule {
  const r = event.recurrence!
  const freq = FREQUENCIES[r.freq]
  if (freq === undefined) throw new Error(`unsupported frequency "${r.freq}"`)
  return new RRule({
    freq,
    interval: r.interval || 1,
    dtstart: toFloating(event.start, tz),
    until: r.until ? toFloating(r.until, tz) : undefined,
    count: r.count,
    byweekday: r.byweekday?.length ? r.byweekday.map((d) => WEEKDAYS[d]) : undefined,
  })
}

function occurrencesInMonth(event: CalendarEvent, monthStart: Date, tz?: string): CalendarEvent[] {
  const rule = buildRule(event, tz)
  const excluded = new Set((event.recurrence!.exdates ?? []).map(minuteKey))
  const duration = event.end.getTime() - event.start.getTime()
  const from = toFloating(monthStart, tz)
  const to = toFloating(addMonths(monthStart, 1), tz)
  const result: CalendarEvent[] = []
  for (const floating of rule.between(from, to, true)) {
    if (floating.getTime() === to.getTime()) continue
    const start = fromFloating(floating, tz)
    if (excluded.has(minuteKey(start))) continue
    result.push({
      ...event,
      id: `${event.id}-${start.getTime()}`,
      originalEventId: event.id,
      occurrenceStart: start,
      start,
      end: new Date(start.getTime() + duration),
    })
  }
  return result
}

const MAX_MONTHS_PER_EVENT = 12
const occurrenceCache = new WeakMap<CalendarEvent, Map<string, CalendarEvent[]>>()

/** Occurrences of one event for one month, cached per event object (C1, LRU of 12 months). */
function cachedMonth(event: CalendarEvent, monthStart: Date, tz?: string): CalendarEvent[] {
  let months = occurrenceCache.get(event)
  if (!months) {
    months = new Map()
    occurrenceCache.set(event, months)
  }
  const key = `${monthStart.getFullYear()}-${monthStart.getMonth()}|${tz ?? ''}`
  let occurrences = months.get(key)
  if (occurrences) {
    months.delete(key)
  } else {
    occurrences = occurrencesInMonth(event, monthStart, tz)
    if (months.size >= MAX_MONTHS_PER_EVENT) months.delete(months.keys().next().value as string)
  }
  months.set(key, occurrences)
  return occurrences
}

/**
 * Expands recurring events into occurrences overlapping `range` (R4). Each occurrence carries
 * `originalEventId` and `occurrenceStart`. Non-recurring events pass through unchanged. An invalid
 * rule renders the master event once (and warns).
 */
const YEAR_MS = 366 * 24 * 60 * 60 * 1000

export function expandRecurrences(events: CalendarEvent[], range: DateRange, anchorTz?: string): CalendarEvent[] {
  const result: CalendarEvent[] = []
  for (const event of events) {
    if (!event.recurrence) {
      result.push(event)
      continue
    }
    // All-day series are calendar dates: expanded in local time, never in the display zone.
    const tz = event.allDay ? undefined : anchorTz
    const lastMonth = startOfMonth(toDisplay(range.end, tz))
    // Start from the month of (range start − duration): an occurrence may begin before the range.
    // The look-back is capped at one year so an absurdly long occurrence cannot scan decades.
    const duration = event.end.getTime() - event.start.getTime()
    if (duration > YEAR_MS) warnOnce(`long-occurrence:${event.id}`, `Event "${event.id}" lasts more than a year: occurrences starting over a year before the visible range are not shown.`)
    const firstMonth = startOfMonth(toDisplay(new Date(range.start.getTime() - Math.min(duration, YEAR_MS)), tz))
    try {
      for (let month = firstMonth; month <= lastMonth; month = addMonths(month, 1)) {
        for (const occurrence of cachedMonth(event, fromDisplay(month, tz), tz)) {
          if (occurrence.end >= range.start && occurrence.start <= range.end) result.push(occurrence)
        }
      }
    } catch (error) {
      warnOnce(`invalid-recurrence:${event.id}`, `Event "${event.id}" has an invalid recurrence rule: ${String(error)}`)
      result.push(event)
    }
  }
  return result
}

/** Strips the fields `expandRecurrences` adds to occurrences. */
export function stripOccurrenceFields(event: CalendarEvent): CalendarEvent {
  const { originalEventId: _originalEventId, occurrenceStart: _occurrenceStart, ...rest } = event
  return rest as CalendarEvent
}

// Shift in the floating domain (pure UTC arithmetic) so the browser's own DST never adds ±1h.
const shiftFloating = (instant: Date, deltaMs: number, tz?: string) =>
  fromFloating(new Date(toFloating(instant, tz).getTime() + deltaMs), tz)

const DAY_MS = 24 * 60 * 60 * 1000
const floatingDay = (floating: Date) => Math.floor(floating.getTime() / DAY_MS)

/**
 * R5: applies to the whole series the move/resize made on one occurrence. The series start moves by
 * the same wall-clock delta (stable across DST), takes the new duration, and `byweekday`/`exdates`
 * follow a day change.
 */
export function shiftSeries(
  master: CalendarEvent,
  occurrence: CalendarEvent,
  newStart: Date,
  newEnd: Date,
  anchorTz?: string,
): CalendarEvent {
  const fromFloat = toFloating(occurrence.start, anchorTz)
  const toFloat = toFloating(newStart, anchorTz)
  const deltaMs = toFloat.getTime() - fromFloat.getTime()
  const dayDelta = floatingDay(toFloat) - floatingDay(fromFloat)
  const start = shiftFloating(master.start, deltaMs, anchorTz)
  const end = new Date(start.getTime() + (newEnd.getTime() - newStart.getTime()))
  const recurrence = master.recurrence && {
    ...master.recurrence,
    byweekday:
      master.recurrence.byweekday && dayDelta % 7 !== 0
        ? master.recurrence.byweekday.map((d) => (((d + dayDelta) % 7) + 7) % 7)
        : master.recurrence.byweekday,
    until: master.recurrence.until && shiftFloating(master.recurrence.until, deltaMs, anchorTz),
    exdates: master.recurrence.exdates?.map((d) => shiftFloating(d, deltaMs, anchorTz)),
  }
  return stripOccurrenceFields({ ...master, start, end, recurrence })
}

/** R6: the series with one occurrence excluded. */
export function excludeOccurrence(master: CalendarEvent, occurrenceStart: Date): CalendarEvent {
  const recurrence = master.recurrence ?? { freq: 'DAILY' as const }
  return { ...master, recurrence: { ...recurrence, exdates: [...(recurrence.exdates ?? []), occurrenceStart] } }
}
