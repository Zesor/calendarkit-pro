import { describe, expect, test } from 'vitest'
import type { CalendarEvent } from '../types'
import type { DaySegment } from './events'
import { layoutDayEvents } from './layout'

const seg = (id: string, startHour: number, endHour: number): DaySegment => {
  const start = new Date(2026, 9, 17, Math.floor(startHour), (startHour % 1) * 60)
  const end = new Date(2026, 9, 17, Math.floor(endHour), (endHour % 1) * 60)
  return { event: { id, title: id, start, end } as CalendarEvent, start, end }
}

const byId = (segments: DaySegment[]) =>
  Object.fromEntries(layoutDayEvents(segments).map((p) => [p.event.id, [p.column, p.columns]]))

describe('layoutDayEvents', () => {
  test('non-overlapping events each take the full width', () => {
    expect(byId([seg('a', 9, 10), seg('b', 10, 11)])).toEqual({ a: [0, 1], b: [0, 1] })
  })

  test('T5: chain A–B, B–C: A and C share a column, B sits next to them', () => {
    expect(byId([seg('a', 9, 10), seg('b', 9.5, 10.5), seg('c', 10, 11)])).toEqual({
      a: [0, 2],
      b: [1, 2],
      c: [0, 2],
    })
  })

  test('three simultaneous events get three columns', () => {
    expect(byId([seg('a', 9, 10), seg('b', 9, 10), seg('c', 9, 10)])).toEqual({ a: [0, 3], b: [1, 3], c: [2, 3] })
  })

  test('a later, separate cluster resets the column count', () => {
    expect(byId([seg('a', 9, 10), seg('b', 9, 10), seg('c', 14, 15)])).toEqual({ a: [0, 2], b: [1, 2], c: [0, 1] })
  })

  test('C3: the result is cached per input array', () => {
    const segments = [seg('a', 9, 10)]
    expect(layoutDayEvents(segments)).toBe(layoutDayEvents(segments))
  })
})
