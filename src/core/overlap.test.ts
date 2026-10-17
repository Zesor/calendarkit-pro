import { describe, expect, test } from 'vitest'
import type { CalendarEvent } from '../types'
import type { DaySegment } from './events'
import { layoutColumns } from './overlap'

const seg = (id: string, startHour: number, endHour: number): DaySegment => {
  const start = new Date(2026, 9, 14, Math.floor(startHour), (startHour % 1) * 60)
  const end = new Date(2026, 9, 14, Math.floor(endHour), (endHour % 1) * 60)
  return { event: { id, title: id, start, end } as CalendarEvent, start, end }
}

const blocks = (segments: DaySegment[], max?: number) =>
  Object.fromEntries(layoutColumns(segments, max).blocks.map((b) => [b.event.id, [b.column, b.span, b.columns]]))

describe('layoutColumns', () => {
  test('a lone event takes the full width', () => {
    expect(blocks([seg('a', 9, 10)])).toEqual({ a: [0, 1, 1] })
  })

  test('an event expands into the next column while it is free during its time', () => {
    // a 10:00–11:45 | b 10:30–11:00 then c 11:00–12:00 share column 1 | d 11:15–11:45 needs column 2.
    // b (10:30–11:00) does not meet d, so it spans columns 1–2.
    expect(blocks([seg('a', 10, 11.75), seg('b', 10.5, 11), seg('c', 11, 12), seg('d', 11.25, 11.75)])).toEqual({
      a: [0, 1, 3],
      b: [1, 2, 3],
      c: [1, 1, 3],
      d: [2, 1, 3],
    })
  })

  test('beyond maxColumns, extra events collapse into one "+N" block in the last column', () => {
    const day = [seg('a', 10, 11.75), seg('b', 10.5, 11), seg('c', 11, 12), seg('d', 11.25, 11.75)]
    const { blocks: shown, more } = layoutColumns(day, 2)
    expect(shown.map((b) => [b.event.id, b.column, b.span, b.columns])).toEqual([['a', 0, 1, 2]])
    expect(more).toHaveLength(1)
    expect(more[0].segments.map((s) => s.event.id).sort()).toEqual(['b', 'c', 'd'])
    expect([more[0].column, more[0].columns]).toEqual([1, 2])
    expect(more[0].start).toEqual(new Date(2026, 9, 14, 10, 30))
    expect(more[0].end).toEqual(new Date(2026, 9, 14, 12))
  })

  test('separate clusters are laid out independently', () => {
    const day = [seg('a', 9, 10), seg('b', 9, 10), seg('c', 14, 15)]
    expect(blocks(day, 2)).toEqual({ a: [0, 1, 2], b: [1, 1, 2], c: [0, 1, 1] })
  })

  test('maxColumns below 2 still shows one event next to the "+N" block', () => {
    const { blocks: shown, more } = layoutColumns([seg('a', 9, 10), seg('b', 9, 10), seg('c', 9, 10)], 1)
    expect(shown).toHaveLength(1)
    expect(more[0].segments).toHaveLength(2)
  })

  test('the layout is cached per (segments array, maxColumns)', () => {
    const day = [seg('a', 9, 10), seg('b', 9.5, 10.5)]
    expect(layoutColumns(day, 3)).toBe(layoutColumns(day, 3))
    expect(layoutColumns(day, 2)).not.toBe(layoutColumns(day, 3))
  })
})
