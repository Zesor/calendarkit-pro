import { addDays, addMonths, endOfMonth, startOfMonth, startOfWeek, subMonths } from 'date-fns'
import type { CalendarEvent } from '../types'
import { type DateRange, excludeOccurrence, shiftSeries, stripOccurrenceFields } from './recurrence'

/** Occurrences are expanded for the focused month ± one month, plus the agenda's 30 days (R4). */
export function expansionRange(monthStart: Date): DateRange {
  return {
    start: startOfWeek(startOfMonth(subMonths(monthStart, 1))),
    end: addDays(endOfMonth(addMonths(monthStart, 1)), 37),
  }
}

/** The recurring (master) event an occurrence comes from, among the normalized source events. */
export const masterOf = (occurrence: CalendarEvent, events: CalendarEvent[]) =>
  events.find((e) => e.id === occurrence.originalEventId)

/**
 * New dates for an event, or for its whole series when it is an occurrence (R5, D1). `original`
 * is the event the consumer stores (the master for an occurrence). `null` when the master is gone.
 */
export function applyChange(
  event: CalendarEvent,
  start: Date,
  end: Date,
  events: CalendarEvent[],
  tz?: string,
): { original: CalendarEvent; updated: CalendarEvent } | null {
  if (!event.originalEventId) return { original: event, updated: { ...event, start, end } }
  const master = masterOf(event, events)
  if (!master) return null
  // All-day series are calendar dates: shift them without a timezone anchor.
  return { original: master, updated: shiftSeries(master, event, start, end, event.allDay ? undefined : tz) }
}

/** R7: a duplicate is always a single event, one calendar day later (DST-safe for all-day events). */
export function duplicateEvent(event: CalendarEvent, id: string): CalendarEvent {
  const { recurrence: _recurrence, ...copy } = stripOccurrenceFields(event)
  const later = (date: Date) => (event.allDay ? addDays(date, 1) : new Date(date.getTime() + 24 * 60 * 60 * 1000))
  return { ...copy, id, title: `${event.title} (Copy)`, start: later(event.start), end: later(event.end) }
}

export type Deletion =
  | { kind: 'event'; id: string }
  | { kind: 'occurrence'; occurrence: CalendarEvent; series: CalendarEvent }

/**
 * R6: what deleting `event` means. An occurrence removes only its date when the consumer handles
 * `onOccurrenceDelete`; otherwise (or when the master is gone) the whole series is deleted.
 */
export function deletionFor(event: CalendarEvent, events: CalendarEvent[], canDeleteOccurrence: boolean): Deletion {
  if (!event.originalEventId) return { kind: 'event', id: event.id }
  const master = masterOf(event, events)
  if (canDeleteOccurrence && master) {
    return { kind: 'occurrence', occurrence: event, series: excludeOccurrence(master, event.occurrenceStart ?? event.start) }
  }
  return { kind: 'event', id: event.originalEventId }
}
