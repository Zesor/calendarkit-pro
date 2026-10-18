import { afterEach, describe, expect, test, vi } from 'vitest'
import type { CalendarEvent } from '../types'
import { excludeOccurrence, expandRecurrences, shiftSeries, stripOccurrenceFields } from './recurrence'
import { resetWarnings } from './warn'

afterEach(() => resetWarnings())

const series = (extra: Partial<CalendarEvent> & Pick<CalendarEvent, 'recurrence'>): CalendarEvent => ({
  id: 's',
  title: 'Standup',
  start: new Date(2026, 9, 5, 9, 0), // Mon 5 Oct 2026, 09:00 Paris
  end: new Date(2026, 9, 5, 9, 30),
  ...extra,
})

const range = (from: Date, to: Date) => ({ start: from, end: to })
const hours = (events: CalendarEvent[]) => events.map((e) => `${e.start.getDate()}@${e.start.getHours()}:${String(e.start.getMinutes()).padStart(2, '0')}`)

describe('expandRecurrences', () => {
  test('non-recurring events pass through untouched', () => {
    const single = { id: 'x', title: 'x', start: new Date(2026, 9, 1), end: new Date(2026, 9, 1, 1) }
    expect(expandRecurrences([single], range(new Date(2026, 9, 1), new Date(2026, 9, 31)))).toEqual([single])
  })

  test('occurrences carry originalEventId, occurrenceStart and a unique id', () => {
    const [first] = expandRecurrences([series({ recurrence: { freq: 'DAILY', count: 2 } })], range(new Date(2026, 9, 1), new Date(2026, 9, 31)))
    expect(first.originalEventId).toBe('s')
    expect(first.occurrenceStart).toEqual(new Date(2026, 9, 5, 9, 0))
    expect(first.id).toBe(`s-${new Date(2026, 9, 5, 9, 0).getTime()}`)
    expect(first.end).toEqual(new Date(2026, 9, 5, 9, 30))
  })

  test('R1: byweekday is honoured (Mon/Wed/Fri → 3 per week)', () => {
    const result = expandRecurrences(
      [series({ recurrence: { freq: 'WEEKLY', byweekday: [0, 2, 4] } })],
      range(new Date(2026, 9, 5), new Date(2026, 9, 11, 23, 59)),
    )
    expect(hours(result)).toEqual(['5@9:00', '7@9:00', '9@9:00'])
  })

  test('R2: exdates are excluded', () => {
    const result = expandRecurrences(
      [series({ recurrence: { freq: 'DAILY', exdates: [new Date(2026, 9, 6, 9, 0)] } })],
      range(new Date(2026, 9, 5), new Date(2026, 9, 7, 23, 59)),
    )
    expect(hours(result)).toEqual(['5@9:00', '7@9:00'])
  })

  test('R3: a weekly 09:00 series stays at 09:00 across the 25 Oct 2026 DST change (Paris, local)', () => {
    const result = expandRecurrences(
      [series({ recurrence: { freq: 'WEEKLY' } })],
      range(new Date(2026, 9, 19), new Date(2026, 10, 2, 23, 59)),
    )
    expect(hours(result)).toEqual(['19@9:00', '26@9:00', '2@9:00'])
  })

  test('R3: anchored in New York, the series stays at 09:00 New York time across its DST change (1 Nov 2026)', () => {
    const ny = series({
      start: new Date('2026-10-26T13:00:00Z'), // 09:00 EDT
      end: new Date('2026-10-26T13:30:00Z'),
      recurrence: { freq: 'WEEKLY' },
    })
    const result = expandRecurrences([ny], range(new Date('2026-10-25T00:00:00Z'), new Date('2026-11-03T00:00:00Z')), 'America/New_York')
    expect(result.map((e) => e.start.toISOString())).toEqual(['2026-10-26T13:00:00.000Z', '2026-11-02T14:00:00.000Z'])
  })

  test('R3: Sydney (southern hemisphere DST starts 4 Oct 2026)', () => {
    const syd = series({
      start: new Date('2026-09-27T23:00:00Z'), // Mon 28 Sep 09:00 AEST
      end: new Date('2026-09-27T23:30:00Z'),
      recurrence: { freq: 'WEEKLY' },
    })
    const result = expandRecurrences([syd], range(new Date('2026-09-27T00:00:00Z'), new Date('2026-10-06T00:00:00Z')), 'Australia/Sydney')
    expect(result.map((e) => e.start.toISOString())).toEqual(['2026-09-27T23:00:00.000Z', '2026-10-04T22:00:00.000Z'])
  })

  test('the anchor zone decides the wall-clock time kept by the series (documented behaviour)', () => {
    const s = series({ start: new Date('2026-10-05T07:00:00Z'), end: new Date('2026-10-05T07:30:00Z'), recurrence: { freq: 'WEEKLY' } })
    const r = range(new Date('2026-10-25T00:00:00Z'), new Date('2026-10-27T00:00:00Z'))
    // 09:00 Paris stays 09:00 Paris (08:00Z after DST); anchored in Tokyo it stays 16:00 Tokyo (07:00Z).
    expect(expandRecurrences([s], r).map((e) => e.start.toISOString())).toEqual(['2026-10-26T08:00:00.000Z'])
    expect(expandRecurrences([s], r, 'Asia/Tokyo').map((e) => e.start.toISOString())).toEqual(['2026-10-26T07:00:00.000Z'])
  })

  test('R4: only occurrences overlapping the range are returned', () => {
    const result = expandRecurrences([series({ recurrence: { freq: 'DAILY' } })], range(new Date(2026, 9, 10), new Date(2026, 9, 12, 23, 59)))
    expect(hours(result)).toEqual(['10@9:00', '11@9:00', '12@9:00'])
  })

  test('an occurrence starting in the previous month but overlapping the range is returned', () => {
    const late = series({ start: new Date(2026, 8, 30, 22, 0), end: new Date(2026, 9, 1, 2, 0), recurrence: { freq: 'MONTHLY' } }) // 30 Sep 22:00 → 1 Oct 02:00
    const result = expandRecurrences([late], range(new Date(2026, 9, 1), new Date(2026, 9, 2)))
    expect(result.map((e) => e.start)).toEqual([new Date(2026, 8, 30, 22, 0)])
  })

  test('count and until limit the series', () => {
    expect(expandRecurrences([series({ recurrence: { freq: 'DAILY', count: 3 } })], range(new Date(2026, 9, 1), new Date(2026, 10, 30)))).toHaveLength(3)
    expect(expandRecurrences([series({ recurrence: { freq: 'DAILY', until: new Date(2026, 9, 7, 23) } })], range(new Date(2026, 9, 1), new Date(2026, 10, 30)))).toHaveLength(3)
  })

  test('C1: the same event returns the same occurrence objects; a new event object recomputes', () => {
    const s = series({ recurrence: { freq: 'DAILY' } })
    const r = range(new Date(2026, 9, 10), new Date(2026, 9, 12))
    const [a] = expandRecurrences([s], r)
    const [b] = expandRecurrences([s], r)
    expect(b).toBe(a)
    const [c] = expandRecurrences([{ ...s }], r)
    expect(c).not.toBe(a)
  })

  test('C1: at most 12 months are cached per event', () => {
    const s = series({ start: new Date(2025, 0, 1, 9), end: new Date(2025, 0, 1, 10), recurrence: { freq: 'DAILY' } })
    const [janFirst] = expandRecurrences([s], range(new Date(2025, 0, 1), new Date(2025, 0, 2)))
    expandRecurrences([s], range(new Date(2025, 1, 1), new Date(2026, 0, 31))) // 12 more months
    const [janAgain] = expandRecurrences([s], range(new Date(2025, 0, 1), new Date(2025, 0, 2)))
    expect(janAgain).not.toBe(janFirst)
    expect(janAgain).toEqual(janFirst)
  })

  test('occurrences lasting over a year: the look-back is capped at one year, with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    // Yearly series, each occurrence lasts 3 years: from 2020, 2021, … all overlap October 2026.
    const marathon = series({ start: new Date(2020, 0, 1), end: new Date(2023, 0, 1), recurrence: { freq: 'YEARLY' } })
    const shown = expandRecurrences([marathon], range(new Date(2026, 9, 1), new Date(2026, 9, 31)))
    expect(shown.map((e) => e.start.getFullYear())).toEqual([2026])
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0][0])).toContain('lasts more than a year')
  })

  test('an invalid rule renders the master once and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const broken = series({ recurrence: { freq: 'FORTNIGHTLY' as never } })
    expect(expandRecurrences([broken], range(new Date(2026, 9, 1), new Date(2026, 9, 31)))).toEqual([broken])
    expect(warn).toHaveBeenCalledTimes(1)
  })
})

describe('series edits', () => {
  const r = range(new Date(2026, 9, 5), new Date(2026, 9, 18))

  test('R5: moving an occurrence by +1h shifts the whole series and strips occurrence fields', () => {
    const master = series({ recurrence: { freq: 'DAILY' } })
    const [, second] = expandRecurrences([master], r) // Tue 6 Oct 09:00
    const updated = shiftSeries(master, second, new Date(2026, 9, 6, 10, 0), new Date(2026, 9, 6, 10, 30))
    expect(updated.id).toBe('s')
    expect(updated.start).toEqual(new Date(2026, 9, 5, 10, 0))
    expect(updated.end).toEqual(new Date(2026, 9, 5, 10, 30))
    expect('originalEventId' in updated).toBe(false)
    expect('occurrenceStart' in updated).toBe(false)
  })

  test('R5: resizing an occurrence changes the series duration only', () => {
    const master = series({ recurrence: { freq: 'DAILY' } })
    const [first] = expandRecurrences([master], r)
    const updated = shiftSeries(master, first, first.start, new Date(2026, 9, 5, 10, 0))
    expect(updated.start).toEqual(master.start)
    expect(updated.end).toEqual(new Date(2026, 9, 5, 10, 0))
  })

  test('R5: moving a Mon/Wed occurrence to Tuesday rotates byweekday and exdates', () => {
    const master = series({ recurrence: { freq: 'WEEKLY', byweekday: [0, 2], exdates: [new Date(2026, 9, 12, 9, 0)] } })
    const [monday] = expandRecurrences([master], r)
    const updated = shiftSeries(master, monday, new Date(2026, 9, 6, 9, 0), new Date(2026, 9, 6, 9, 30))
    expect(updated.recurrence?.byweekday).toEqual([1, 3])
    expect(updated.recurrence?.exdates).toEqual([new Date(2026, 9, 13, 9, 0)])
  })

  test('R5: the wall-clock delta is kept across DST', () => {
    const master = series({ recurrence: { freq: 'WEEKLY' } })
    const occurrences = expandRecurrences([master], range(new Date(2026, 9, 26), new Date(2026, 9, 27)))
    const afterDst = occurrences[0] // Mon 26 Oct 09:00 (after the change)
    const updated = shiftSeries(master, afterDst, new Date(2026, 9, 26, 11, 0), new Date(2026, 9, 26, 11, 30))
    expect(updated.start).toEqual(new Date(2026, 9, 5, 11, 0))
  })

  test('R5: moving an occurrence by 7 days across the DST change keeps 09:00 (no ±1h drift)', () => {
    const master = series({ start: new Date(2026, 9, 1, 9, 0), end: new Date(2026, 9, 1, 9, 30), recurrence: { freq: 'WEEKLY', exdates: [new Date(2026, 9, 15, 9, 0)] } })
    const occurrence = expandRecurrences([master], range(new Date(2026, 9, 22), new Date(2026, 9, 23)))[0] // Thu 22 Oct 09:00
    const updated = shiftSeries(master, occurrence, new Date(2026, 9, 29, 9, 0), new Date(2026, 9, 29, 9, 30))
    expect(updated.start).toEqual(new Date(2026, 9, 8, 9, 0))
    expect(updated.recurrence?.exdates).toEqual([new Date(2026, 9, 22, 9, 0)])
  })

  test('moving a series later also moves recurrence.until, keeping the last occurrence', () => {
    const master = series({ recurrence: { freq: 'DAILY', until: new Date(2026, 9, 7, 9, 0) } }) // 5, 6, 7 Oct
    const [first] = expandRecurrences([master], range(new Date(2026, 9, 5), new Date(2026, 9, 6)))
    const updated = shiftSeries(master, first, new Date(2026, 9, 5, 10, 0), new Date(2026, 9, 5, 10, 30))
    expect(updated.recurrence?.until).toEqual(new Date(2026, 9, 7, 10, 0))
    expect(expandRecurrences([updated], range(new Date(2026, 9, 1), new Date(2026, 9, 31)))).toHaveLength(3)
  })

  test('R6: excludeOccurrence appends the occurrence start to exdates', () => {
    const master = series({ recurrence: { freq: 'DAILY' } })
    const updated = excludeOccurrence(master, new Date(2026, 9, 6, 9, 0))
    expect(updated.recurrence?.exdates).toEqual([new Date(2026, 9, 6, 9, 0)])
    expect(hours(expandRecurrences([updated], range(new Date(2026, 9, 5), new Date(2026, 9, 7, 23))))).toEqual(['5@9:00', '7@9:00'])
  })

  test('stripOccurrenceFields removes originalEventId and occurrenceStart only', () => {
    const occurrence = { id: 'o', title: 't', start: new Date(), end: new Date(), originalEventId: 's', occurrenceStart: new Date() }
    expect(stripOccurrenceFields(occurrence)).toEqual({ id: 'o', title: 't', start: occurrence.start, end: occurrence.end })
  })
})
