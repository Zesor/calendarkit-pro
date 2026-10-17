import { describe, expect, test } from 'vitest'
import type { CalendarEvent } from '../types'
import { dayEventSpan, isDayEvent, layoutDayRow, partitionDayEvents } from './allDay'

const ev = (id: string, start: Date, end: Date, allDay = false): CalendarEvent => ({ id, title: id, start, end, allDay })
const week = Array.from({ length: 7 }, (_, i) => new Date(2026, 9, 12 + i)) // Mon 12 → Sun 18 Oct 2026

describe('isDayEvent', () => {
  test('allDay events and timed events of 24 h or more go to the all-day row', () => {
    expect(isDayEvent(ev('a', new Date(2026, 9, 14), new Date(2026, 9, 15), true))).toBe(true)
    expect(isDayEvent(ev('f', new Date(2026, 9, 14, 22), new Date(2026, 9, 16, 4)))).toBe(true) // 30 h flight
    expect(isDayEvent(ev('n', new Date(2026, 9, 14, 22), new Date(2026, 9, 15, 2)))).toBe(false) // 4 h, stays in the grid
  })
})

describe('dayEventSpan', () => {
  test('exclusive end: Mon 00:00 → Thu 00:00 covers Mon–Wed', () => {
    expect(dayEventSpan(ev('c', new Date(2026, 9, 12), new Date(2026, 9, 15), true))).toEqual({ firstDay: new Date(2026, 9, 12), lastDay: new Date(2026, 9, 14) })
  })

  test('tolerated ends: same-day 23:59 and end equal to start mean one day', () => {
    expect(dayEventSpan(ev('a', new Date(2026, 9, 14), new Date(2026, 9, 14, 23, 59), true)).lastDay).toEqual(new Date(2026, 9, 14))
    expect(dayEventSpan(ev('b', new Date(2026, 9, 14), new Date(2026, 9, 14), true)).lastDay).toEqual(new Date(2026, 9, 14))
  })

  test('all-day dates are not shifted by the display zone', () => {
    const holiday = ev('h', new Date(2026, 9, 14), new Date(2026, 9, 15), true)
    expect(dayEventSpan(holiday, 'Asia/Tokyo')).toEqual({ firstDay: new Date(2026, 9, 14), lastDay: new Date(2026, 9, 14) })
  })

  test('date-only values (UTC midnight, e.g. new Date("2026-10-12")) are read as those dates', () => {
    const offsite = ev('o', new Date('2026-10-12'), new Date('2026-10-15'), true)
    expect(dayEventSpan(offsite)).toEqual({ firstDay: new Date(2026, 9, 12), lastDay: new Date(2026, 9, 14) })
  })

  test('long timed events follow the display zone', () => {
    const flight = ev('f', new Date('2026-10-14T20:00:00Z'), new Date('2026-10-16T02:00:00Z'))
    expect(dayEventSpan(flight)).toEqual({ firstDay: new Date(2026, 9, 14), lastDay: new Date(2026, 9, 16) }) // Paris
    expect(dayEventSpan(flight, 'Asia/Tokyo')).toEqual({ firstDay: new Date(2026, 9, 15), lastDay: new Date(2026, 9, 16) })
  })
})

describe('partitionDayEvents', () => {
  test('splits and caches per (array, zone)', () => {
    const events = [ev('a', new Date(2026, 9, 14), new Date(2026, 9, 15), true), ev('t', new Date(2026, 9, 14, 9), new Date(2026, 9, 14, 10))]
    const result = partitionDayEvents(events)
    expect(result.dayEvents.map((e) => e.id)).toEqual(['a'])
    expect(result.timedEvents.map((e) => e.id)).toEqual(['t'])
    expect(partitionDayEvents(events)).toBe(result)
  })
})

describe('layoutDayRow', () => {
  test('packs overlapping bars into lanes, longer first', () => {
    const conference = ev('conf', new Date(2026, 9, 12), new Date(2026, 9, 15), true) // Mon–Wed
    const fair = ev('fair', new Date(2026, 9, 14), new Date(2026, 9, 15), true) // Wed
    const holiday = ev('hol', new Date(2026, 9, 15), new Date(2026, 9, 26), true) // Thu → next week
    const { segments, laneCount } = layoutDayRow(week, [fair, holiday, conference])
    const byId = Object.fromEntries(segments.map((s) => [s.event.id, [s.startCol, s.span, s.lane, s.continuesBefore, s.continuesAfter]]))
    expect(byId).toEqual({ conf: [0, 3, 0, false, false], fair: [2, 1, 1, false, false], hol: [3, 4, 0, false, true] })
    expect(laneCount).toBe(2)
  })

  test('an event that started before the row is clipped and flagged', () => {
    const holiday = ev('hol', new Date(2026, 9, 8), new Date(2026, 9, 14), true) // Thu 8 → Tue 13
    expect(layoutDayRow(week, [holiday]).segments[0]).toMatchObject({ startCol: 0, span: 2, continuesBefore: true, continuesAfter: false })
  })

  test('events outside the row are ignored, and a single-day row works', () => {
    const other = ev('o', new Date(2026, 9, 1), new Date(2026, 9, 2), true)
    expect(layoutDayRow(week, [other]).segments).toEqual([])
    const day = layoutDayRow([new Date(2026, 9, 14)], [ev('a', new Date(2026, 9, 12), new Date(2026, 9, 20), true)])
    expect(day.segments[0]).toMatchObject({ startCol: 0, span: 1, continuesBefore: true, continuesAfter: true })
  })

  test('the layout is cached per (events, zone, row)', () => {
    const events = [ev('a', new Date(2026, 9, 14), new Date(2026, 9, 15), true)]
    expect(layoutDayRow(week, events)).toBe(layoutDayRow(week, events))
  })
})
