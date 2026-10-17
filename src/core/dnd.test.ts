import { describe, expect, test } from 'vitest'
import type { CalendarEvent } from '../types'
import { computeDayMove, computeDayResize, computeDrop, computeResizeEnd } from './dnd'

const event = (start: Date, end: Date, extra: Partial<CalendarEvent> = {}) => ({ id: 'e', title: 'e', start, end, ...extra }) as CalendarEvent

describe('computeDrop (D3)', () => {
  test('week view without zone: takes the slot time and keeps the duration', () => {
    const e = event(new Date(2026, 9, 15, 9, 0), new Date(2026, 9, 15, 10, 30))
    expect(computeDrop({ event: e, overDate: new Date(2026, 9, 16, 14, 15), view: 'week' })).toEqual({
      start: new Date(2026, 9, 16, 14, 15),
      end: new Date(2026, 9, 16, 15, 45),
      resourceId: undefined,
    })
  })

  test('month view keeps the wall-clock time and changes the day', () => {
    const e = event(new Date(2026, 9, 15, 9, 20), new Date(2026, 9, 15, 10, 20))
    expect(computeDrop({ event: e, overDate: new Date(2026, 9, 20), view: 'month' })?.start).toEqual(new Date(2026, 9, 20, 9, 20))
  })

  test('week view in New York: the slot is New York wall time', () => {
    const e = event(new Date('2026-10-15T13:00:00Z'), new Date('2026-10-15T14:00:00Z'))
    const result = computeDrop({ event: e, overDate: new Date(2026, 9, 16, 9, 0), view: 'week', tz: 'America/New_York' })
    expect(result?.start.toISOString()).toBe('2026-10-16T13:00:00.000Z')
  })

  test('month view in Paris across DST keeps 09:00 Paris time', () => {
    const e = event(new Date('2026-10-23T07:00:00Z'), new Date('2026-10-23T08:00:00Z')) // Fri 09:00 CEST
    const result = computeDrop({ event: e, overDate: new Date(2026, 9, 27), view: 'month', tz: 'Europe/Paris' })
    expect(result?.start.toISOString()).toBe('2026-10-27T08:00:00.000Z') // Tue 09:00 CET
  })

  test('resource view moves the event to the target resource', () => {
    const e = event(new Date(2026, 9, 15, 9), new Date(2026, 9, 15, 10), { resourceId: 'a' })
    expect(computeDrop({ event: e, overDate: new Date(2026, 9, 15, 9), overResourceId: 'b', view: 'resource' })?.resourceId).toBe('b')
  })

  test('dropping the second-day block of a night event in place changes nothing (grab offset)', () => {
    const night = event(new Date(2026, 9, 15, 22), new Date(2026, 9, 16, 2))
    expect(computeDrop({ event: night, overDate: new Date(2026, 9, 16, 0, 0), grabOffsetMs: 2 * 3600_000, view: 'week' })).toBeNull()
    expect(computeDrop({ event: night, overDate: new Date(2026, 9, 16, 1, 0), grabOffsetMs: 2 * 3600_000, view: 'week' })?.start).toEqual(new Date(2026, 9, 15, 23))
  })

  test('returns null when nothing changes', () => {
    const e = event(new Date(2026, 9, 15, 9), new Date(2026, 9, 15, 10), { resourceId: 'a' })
    expect(computeDrop({ event: e, overDate: new Date(2026, 9, 15, 9), overResourceId: 'a', view: 'resource' })).toBeNull()
  })
})

describe('computeResizeEnd', () => {
  const e = event(new Date(2026, 9, 15, 9), new Date(2026, 9, 15, 10))
  test('extends by the delta', () => {
    expect(computeResizeEnd(e, 30)).toEqual(new Date(2026, 9, 15, 10, 30))
  })
  test('never shorter than the minimum duration', () => {
    expect(computeResizeEnd(e, -120)).toEqual(new Date(2026, 9, 15, 9, 15))
  })
})

describe('computeDayMove', () => {
  const conference = event(new Date(2026, 9, 12), new Date(2026, 9, 15), { allDay: true }) // Mon–Wed

  test('moves an all-day event by whole days, keeping its length', () => {
    expect(computeDayMove(conference, new Date(2026, 9, 14), 0)).toEqual({ start: new Date(2026, 9, 14), end: new Date(2026, 9, 17) })
  })

  test('uses the grabbed day: dragging the Wednesday onto Friday moves Mon→Wed', () => {
    expect(computeDayMove(conference, new Date(2026, 9, 16), 2)?.start).toEqual(new Date(2026, 9, 14))
  })

  test('keeps local dates across the DST change (25 Oct 2026, Paris)', () => {
    const day = event(new Date(2026, 9, 23), new Date(2026, 9, 24), { allDay: true })
    expect(computeDayMove(day, new Date(2026, 9, 27), 0)).toEqual({ start: new Date(2026, 9, 27), end: new Date(2026, 9, 28) })
  })

  test('moves a long timed event by days in the display zone, keeping its times', () => {
    const flight = event(new Date('2026-10-14T20:00:00Z'), new Date('2026-10-16T02:00:00Z'))
    const moved = computeDayMove(flight, new Date(2026, 9, 15), 0, 'America/New_York') // first day 14 Oct NY → 15
    expect(moved?.start.toISOString()).toBe('2026-10-15T20:00:00.000Z')
    expect(moved?.end.toISOString()).toBe('2026-10-17T02:00:00.000Z')
  })

  test('returns null when dropped where it already is', () => {
    expect(computeDayMove(conference, new Date(2026, 9, 13), 1)).toBeNull()
  })
})

describe('computeDayResize', () => {
  const conference = event(new Date(2026, 9, 12), new Date(2026, 9, 15), { allDay: true }) // Mon–Wed

  test('stretching to Friday gives an exclusive end on Saturday 00:00', () => {
    expect(computeDayResize(conference, new Date(2026, 9, 16))).toEqual(new Date(2026, 9, 17))
  })

  test('a long timed event shrunk to its first days stays at least 24 h long (never ends before it starts)', () => {
    const flight = event(new Date(2026, 9, 14, 20), new Date(2026, 9, 16, 2)) // Wed 20:00 → Fri 02:00
    expect(computeDayResize(flight, new Date(2026, 9, 14))).toEqual(new Date(2026, 9, 15, 20))
    expect(computeDayResize(flight, new Date(2026, 9, 15))).toEqual(new Date(2026, 9, 15, 20))
  })

  test('cannot shrink below one day', () => {
    expect(computeDayResize(conference, new Date(2026, 9, 1))).toEqual(new Date(2026, 9, 13))
  })

  test('a long timed event keeps its end time', () => {
    const flight = event(new Date(2026, 9, 14, 22), new Date(2026, 9, 16, 4))
    expect(computeDayResize(flight, new Date(2026, 9, 17))).toEqual(new Date(2026, 9, 17, 4))
  })

  test('returns null when the last day does not change', () => {
    expect(computeDayResize(conference, new Date(2026, 9, 14))).toBeNull()
  })
})
