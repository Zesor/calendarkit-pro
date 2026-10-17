import { afterEach, describe, expect, test, vi } from 'vitest'
import type { CalendarEvent } from '../types'
import { eventsByStartDay, normalizeEvents, segmentsByDisplayDay } from './events'
import { resetWarnings } from './warn'

const ev = (id: string, start: Date | string, end: Date | string, extra: Partial<CalendarEvent> = {}) =>
  ({ id, title: id, start, end, ...extra }) as CalendarEvent

afterEach(() => resetWarnings())

describe('normalizeEvents', () => {
  test('all-day date-only values (UTC midnight) become local midnights of the same dates', () => {
    const offsite = {
      id: 'o', title: 'o', allDay: true, start: '2026-10-24', end: new Date('2026-10-25'),
      recurrence: { freq: 'WEEKLY', exdates: ['2026-10-31'] },
    } as unknown as CalendarEvent
    const [a] = normalizeEvents([offsite])
    expect(a.start).toEqual(new Date(2026, 9, 24))
    expect(a.end).toEqual(new Date(2026, 9, 25))
    expect(a.recurrence?.exdates).toEqual([new Date(2026, 9, 31)])
    // Timed events and local midnights are untouched
    const [b] = normalizeEvents([ev('b', '2026-10-24T00:00:00Z', '2026-10-24T01:00:00Z')])
    expect(b.start).toEqual(new Date('2026-10-24T00:00:00Z'))
    const local = { id: 'l', title: 'l', allDay: true, start: new Date(2026, 9, 24), end: new Date(2026, 9, 25) }
    expect(normalizeEvents([local])[0]).toBe(local)
  })

  test('coerces ISO strings and timestamps to Date', () => {
    const [a] = normalizeEvents([ev('a', '2026-10-17T09:00:00Z', 1_792_227_600_000 as unknown as string)])
    expect(a.start).toEqual(new Date('2026-10-17T09:00:00Z'))
    expect(a.end).toBeInstanceOf(Date)
  })

  test('keeps the same object when dates are already Date instances', () => {
    const input = ev('a', new Date(2026, 9, 17, 9), new Date(2026, 9, 17, 10))
    expect(normalizeEvents([input])[0]).toBe(input)
  })

  test('skips invalid dates and end before start; keeps duplicate ids (1.x behaviour) — warning once each', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const ok = ev('ok', new Date(2026, 9, 17, 9), new Date(2026, 9, 17, 10))
    const duplicate = ev('ok', new Date(2026, 9, 18, 9), new Date(2026, 9, 18, 10))
    const result = normalizeEvents([
      ok,
      ev('bad', 'not a date', new Date()),
      ev('reversed', new Date(2026, 9, 17, 10), new Date(2026, 9, 17, 9)),
      duplicate,
    ])
    expect(result).toEqual([ok, duplicate])
    expect(warn).toHaveBeenCalledTimes(3)
  })

  test('coerces recurrence.until and exdates', () => {
    const [a] = normalizeEvents([
      ev('r', new Date(2026, 9, 1, 9), new Date(2026, 9, 1, 10), {
        recurrence: { freq: 'DAILY', until: '2026-10-10' as unknown as Date, exdates: ['2026-10-03T07:00:00Z' as unknown as Date] },
      }),
    ])
    expect(a.recurrence?.until).toBeInstanceOf(Date)
    expect(a.recurrence?.exdates?.[0]).toBeInstanceOf(Date)
  })

  test('is cached per input array', () => {
    const input = [ev('a', '2026-10-17T09:00:00Z', '2026-10-17T10:00:00Z')]
    expect(normalizeEvents(input)).toBe(normalizeEvents(input))
  })
})

describe('eventsByStartDay', () => {
  test('groups by display start day and is cached (C2)', () => {
    const events = [
      ev('a', new Date('2026-10-17T23:30:00Z'), new Date('2026-10-18T00:30:00Z')),
      ev('b', new Date('2026-10-17T10:00:00Z'), new Date('2026-10-17T11:00:00Z')),
    ]
    const tokyo = eventsByStartDay(events, 'Asia/Tokyo')
    expect(tokyo.get('2026-10-18')?.map((e) => e.id)).toEqual(['a'])
    expect(tokyo.get('2026-10-17')?.map((e) => e.id)).toEqual(['b'])
    expect(eventsByStartDay(events, 'Asia/Tokyo')).toBe(tokyo)
    expect(eventsByStartDay(events)).not.toBe(tokyo)
  })
})

describe('segmentsByDisplayDay', () => {
  test('T4: an event from 22:00 to 02:00 yields two clipped segments', () => {
    const night = ev('n', new Date(2026, 9, 17, 22), new Date(2026, 9, 18, 2))
    const map = segmentsByDisplayDay([night])
    expect(map.get('2026-10-17')).toEqual([{ event: night, start: new Date(2026, 9, 17, 22), end: new Date(2026, 9, 18, 0) }])
    expect(map.get('2026-10-18')).toEqual([{ event: night, start: new Date(2026, 9, 18, 0), end: new Date(2026, 9, 18, 2) }])
  })

  test('an event ending exactly at midnight stays on one day', () => {
    const late = ev('l', new Date(2026, 9, 17, 23), new Date(2026, 9, 18, 0))
    expect([...segmentsByDisplayDay([late]).keys()]).toEqual(['2026-10-17'])
  })

  test('a zero-length event keeps one segment', () => {
    const point = ev('p', new Date(2026, 9, 17, 9), new Date(2026, 9, 17, 9))
    expect(segmentsByDisplayDay([point]).get('2026-10-17')).toHaveLength(1)
  })

  test('a range bounds the work: an endless event yields only the requested days', () => {
    const endless = ev('forever', new Date(2020, 0, 1, 9), new Date(9999, 0, 1))
    const t0 = performance.now()
    const map = segmentsByDisplayDay([endless], undefined, { start: new Date(2026, 9, 12), end: new Date(2026, 9, 19) })
    expect([...map.keys()]).toHaveLength(7)
    expect(map.get('2026-10-12')?.[0]).toMatchObject({ start: new Date(2026, 9, 12), end: new Date(2026, 9, 13) })
    expect(performance.now() - t0).toBeLessThan(100)
  })

  test('an event inside the DST fall-back hour (wall end before wall start) is kept', () => {
    const fallBack = ev('fb', new Date('2026-10-25T00:45:00Z'), new Date('2026-10-25T01:15:00Z')) // 02:45 CEST → 02:15 CET
    expect(segmentsByDisplayDay([fallBack], 'Europe/Paris').get('2026-10-25')).toHaveLength(1)
  })

  test('segments use the display zone and are cached per zone', () => {
    const events = [ev('a', new Date('2026-10-17T14:00:00Z'), new Date('2026-10-17T16:00:00Z'))]
    const tokyo = segmentsByDisplayDay(events, 'Asia/Tokyo')
    expect(tokyo.get('2026-10-17')?.[0].start).toEqual(new Date(2026, 9, 17, 23))
    expect(tokyo.get('2026-10-18')?.[0].end).toEqual(new Date(2026, 9, 18, 1))
    expect(segmentsByDisplayDay(events, 'Asia/Tokyo')).toBe(tokyo)
  })
})
