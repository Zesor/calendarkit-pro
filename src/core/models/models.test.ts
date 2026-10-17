import { describe, expect, test } from 'vitest'
import type { CalendarEvent, Resource } from '../../types'
import { createCalendar } from '../store'
import { selectAgenda, selectFlowDay, selectResources } from './lists'
import { selectMonth } from './month'
import { selectTimeGrid, visibleDays } from './timeGrid'

const now = new Date(2026, 9, 14, 11, 52) // Wednesday 14 October 2026
const at = (day: number, h: number, m = 0) => new Date(2026, 9, day, h, m)
const ev = (id: string, start: Date, end: Date, extra: Partial<CalendarEvent> = {}): CalendarEvent => ({ id, title: id, start, end, ...extra })
const state = (events: CalendarEvent[], extra: Parameters<typeof createCalendar>[0] = {}) =>
  createCalendar({ defaultEvents: events, defaultDate: now, now: () => now, ...extra }).getState()

describe('selectTimeGrid', () => {
  const events = [
    ev('review', at(14, 10), at(14, 11, 45)),
    ev('call', at(14, 10, 30), at(14, 11)),
    ev('vendor', at(14, 11), at(14, 12)),
    ev('coffee', at(14, 11, 15), at(14, 11, 45)),
    ev('night', at(14, 22), at(15, 2)),
    ev('conf', new Date(2026, 9, 12), new Date(2026, 9, 15), { allDay: true }),
  ]

  test('week days follow weekStartsOn; the day view shows one day', () => {
    const s = state(events)
    expect(visibleDays(s).map((d) => d.getDate())).toEqual([12, 13, 14, 15, 16, 17, 18])
    expect(visibleDays(s, 0)[0].getDate()).toBe(11)
    expect(visibleDays(state(events, { defaultView: 'day' })).map((d) => d.getDate())).toEqual([14])
  })

  test('blocks carry minutes since midnight, columns and spans; extra overlaps become "+N"', () => {
    const grid = selectTimeGrid(state(events), { maxColumns: 2, now })
    const wed = grid.columns[2]
    expect(wed.blocks.map((b) => [b.event.id, b.top, b.height, b.column, b.span, b.columns])).toEqual([
      ['review', 600, 105, 0, 1, 2],
      ['night', 1320, 120, 0, 1, 1],
    ])
    expect(wed.more).toEqual([{ events: [expect.objectContaining({ id: 'call' }), expect.objectContaining({ id: 'vendor' }), expect.objectContaining({ id: 'coffee' })], top: 630, height: 90, column: 1, columns: 2 }])
  })

  test('an overnight event continues on the next day; all-day events go to the all-day row', () => {
    const grid = selectTimeGrid(state(events), { now })
    const night = grid.columns[3].blocks.find((b) => b.event.id === 'night')!
    expect([night.top, night.height, night.continuesBefore, night.continuesAfter]).toEqual([0, 120, true, false])
    expect(grid.allDay.segments.map((s) => [s.event.id, s.startCol, s.span])).toEqual([['conf', 0, 3]])
  })

  test('a display timezone different from the browser puts blocks on that zone\'s wall-clock days', () => {
    // 20:00 UTC on Wed 14 is Thu 15 05:00 in Tokyo (the browser runs in Paris).
    const flight = ev('flight', new Date('2026-10-14T20:00:00Z'), new Date('2026-10-14T21:00:00Z'))
    const grid = selectTimeGrid(state([flight], { timezone: 'Asia/Tokyo' }), { now })
    const block = grid.columns.find((c) => c.blocks.length > 0)!
    expect([block.key, block.blocks[0].top, block.blocks[0].height]).toEqual(['2026-10-15', 5 * 60, 60])
  })

  test('the current-time line is set only when today is visible', () => {
    expect(selectTimeGrid(state(events), { now }).now).toEqual({ column: 2, minutes: 11 * 60 + 52 })
    expect(selectTimeGrid(state(events, { defaultDate: at(21, 9) }), { now }).now).toBeNull()
  })

  test('the model is cached per state and options', () => {
    const s = state(events)
    expect(selectTimeGrid(s, { now })).toBe(selectTimeGrid(s, { now }))
    expect(selectTimeGrid(s, { now, maxColumns: 2 })).not.toBe(selectTimeGrid(s, { now }))
  })
})

describe('selectMonth', () => {
  test('week rows with bars, day cells with timed events by start time', () => {
    const s = state([
      ev('b', at(14, 15), at(14, 16)),
      ev('a', at(14, 9), at(14, 10)),
      ev('trip', new Date(2026, 9, 15), new Date(2026, 9, 21), { allDay: true }),
    ])
    const month = selectMonth(s, { now })
    expect(month.weeks).toHaveLength(5)
    const week = month.weeks[2]
    expect(week.cells.find((c) => c.key === '2026-10-14')).toMatchObject({ isToday: true, inMonth: true, timed: [expect.objectContaining({ id: 'a' }), expect.objectContaining({ id: 'b' })] })
    expect(week.bars.segments.map((x) => [x.event.id, x.startCol, x.span, x.continuesAfter])).toEqual([['trip', 3, 4, true]])
    expect(month.weeks[0].cells[0]).toMatchObject({ key: '2026-09-28', inMonth: false })
  })
})

describe('selectAgenda, selectFlowDay, selectResources', () => {
  test('agenda: events starting within the window, grouped by day', () => {
    const s = state([ev('later', at(20, 9), at(20, 10)), ev('first', at(14, 9), at(14, 10)), ev('past', at(1, 9), at(1, 10))])
    expect(selectAgenda(s, { days: 30 }).map((g) => [g.key, g.events.map((e) => e.id)])).toEqual([['2026-10-14', ['first']], ['2026-10-20', ['later']]])
  })

  test('flow: free slots of an hour or more, the current time, all-day events apart', () => {
    const s = state([ev('standup', at(14, 9), at(14, 9, 30)), ev('review', at(14, 10), at(14, 11, 45)), ev('lunch', at(14, 12, 30), at(14, 13, 30)), ev('conf', new Date(2026, 9, 12), new Date(2026, 9, 15), { allDay: true })])
    const flow = selectFlowDay(s, { day: at(14, 0), now })
    expect(flow.allDay.map((e) => e.id)).toEqual(['conf'])
    expect(flow.items.map((i) => (i.kind === 'event' ? i.event.id : i.kind === 'free' ? `free ${i.start.getHours()}-${i.end.getHours()}` : 'now'))).toEqual(['free 8-9', 'standup', 'review', 'now', 'lunch', 'free 13-20'])
  })

  test('resources: each resource with its events of the day', () => {
    const rooms: Resource[] = [{ id: 'atlas', label: 'Atlas' }, { id: 'b', label: 'Salle B' }]
    const s = state([ev('x', at(14, 9), at(14, 10), { resourceId: 'b' }), ev('y', at(15, 9), at(15, 10), { resourceId: 'b' }), ev('z', at(14, 9), at(14, 10))])
    expect(selectResources(s, rooms).map((r) => [r.resource.id, r.events.map((e) => e.id)])).toEqual([['atlas', []], ['b', ['x']]])
  })
})
