import { describe, expect, test } from 'vitest'
import type { CalendarEvent } from '../types'
import { computeDrop, computeResizeEnd } from './dnd'

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
