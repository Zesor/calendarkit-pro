import { describe, expect, test } from 'vitest'
import type { CalendarEvent } from '../../types'
import { createCalendar } from '../store'
import { selectMonth } from './month'
import { selectTimeGrid } from './timeGrid'

// 10 000 events over October 2026, with overlaps and a few recurring series: the performance
// promise of the README. It runs in ~25 ms locally: the threshold leaves a 20x margin for CI machines.
function manyEvents(count: number): CalendarEvent[] {
  const events: CalendarEvent[] = []
  for (let i = 0; i < count; i++) {
    const day = 1 + (i % 31)
    const hour = 7 + (i % 12)
    const start = new Date(2026, 9, day, hour, (i % 4) * 15)
    events.push({ id: `e${i}`, title: `Event ${i}`, start, end: new Date(start.getTime() + (30 + (i % 5) * 30) * 60000), ...(i % 500 === 0 ? { recurrence: { freq: 'WEEKLY' as const } } : {}) })
  }
  return events
}

describe('performance with 10 000 events', () => {
  test('store, month and week models are computed in under 500 ms', () => {
    const events = manyEvents(10_000)
    const t0 = performance.now()
    const state = createCalendar({ defaultEvents: events, defaultDate: new Date(2026, 9, 14), now: () => new Date(2026, 9, 14, 12) }).getState()
    const month = selectMonth(state)
    const grid = selectTimeGrid(state, { maxColumns: 3 })
    const elapsed = performance.now() - t0
    expect(month.weeks.length).toBeGreaterThan(3)
    expect(grid.columns).toHaveLength(7)
    expect(elapsed).toBeLessThan(500)
  })
})
