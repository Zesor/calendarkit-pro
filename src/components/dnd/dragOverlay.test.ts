import { describe, expect, test } from 'vitest'
import type { CalendarEvent } from '../../types'
import { dragOverlaySize } from './dragOverlay'

describe('dragOverlaySize', () => {
  const hour: CalendarEvent = { id: 'h', title: 'h', start: new Date(2026, 9, 14, 9), end: new Date(2026, 9, 14, 10) }
  const days: CalendarEvent = { id: 'd', title: 'd', start: new Date(2026, 9, 12), end: new Date(2026, 9, 15), allDay: true }

  test('an all-day bar keeps the size of the dragged bar in every view', () => {
    expect(dragOverlaySize('week', days, true)).toEqual({})
    expect(dragOverlaySize('month', days, true)).toEqual({})
  })

  test('timed events keep the historical ghost sizes', () => {
    expect(dragOverlaySize('week', hour, false)).toEqual({ width: '150px', height: 60 })
    expect(dragOverlaySize('day', hour, false)).toEqual({ width: '150px', height: 80 })
    expect(dragOverlaySize('month', hour, false)).toEqual({ width: '100%' })
    expect(dragOverlaySize('resource', hour, false)).toEqual({ width: '100px', height: 80 })
  })
})
