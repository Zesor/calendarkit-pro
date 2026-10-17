import { describe, expect, test } from 'vitest'
import type { ClientRect, CollisionDetection, DroppableContainer } from '@dnd-kit/core'
import type { CalendarEvent } from '../../types'
import { dayAwareCollision, dragOverlaySize } from './dragOverlay'

const rect = (left: number, width: number): ClientRect => ({ left, width, top: 0, height: 20, right: left + width, bottom: 20 })
const container = (id: string): DroppableContainer =>
  ({ id, key: id, data: { current: {} }, disabled: false, node: { current: null }, rect: { current: null } }) as unknown as DroppableContainer

// Three day cells (Mon, Tue, Wed), 100 px each.
const cells = ['mon', 'tue', 'wed']
const args = (data: Record<string, unknown>, pointerX: number, overlayLeft: number): Parameters<CollisionDetection>[0] => ({
  active: { id: 'a', data: { current: data }, rect: { current: { initial: null, translated: null } } },
  collisionRect: rect(overlayLeft, 100),
  droppableRects: new Map(cells.map((id, i) => [id, rect(i * 100, 100)])),
  droppableContainers: cells.map(container),
  pointerCoordinates: { x: pointerX, y: 10 },
})

describe('dayAwareCollision', () => {
  test('an all-day bar targets the cell under the pointer, not under the overlay', () => {
    // Bar grabbed on its last day: the overlay (left-aligned with the bar) covers Mon, the pointer is on Wed.
    const [first] = dayAwareCollision(args({ grabDayOffset: 2 }, 250, 0))
    expect(first.id).toBe('wed')
  })

  test('timed events keep the overlay-based detection', () => {
    const [first] = dayAwareCollision(args({ grabOffsetMs: 0 }, 250, 0))
    expect(first.id).toBe('mon')
  })
})

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
