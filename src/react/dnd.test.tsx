import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, test } from 'vitest'
import type { ClientRect, CollisionDetection, DragEndEvent, DroppableContainer } from '@dnd-kit/core'
import { createCalendar } from 'calendarkit-pro/core'
import type { CalendarEvent } from '../types'
import { CalendarDndContext, dayAwareCollision, dragEndToMove, useActiveDrag, useDraggableEvent, useDroppableSlot } from './dnd'

afterEach(cleanup)

const now = () => new Date(2026, 9, 14, 11, 52)
const lunch: CalendarEvent = { id: 'lu', title: 'Lunch', start: new Date(2026, 9, 14, 12, 30), end: new Date(2026, 9, 14, 13, 30) }
const drag = (active: Record<string, unknown>, over: Record<string, unknown> | null) =>
  ({ active: { id: 'a', data: { current: active } }, over: over && { id: 'o', data: { current: over } } }) as unknown as DragEndEvent

describe('dragEndToMove', () => {
  test('maps the draggable and droppable data to a store move (eventId, or the 1.x `event`)', () => {
    expect(dragEndToMove(drag({ eventId: 'lu', event: lunch, grabOffsetMs: 900000 }, { date: new Date(2026, 9, 16, 14), resourceId: 'b' }))).toEqual({
      eventId: 'lu', target: { date: new Date(2026, 9, 16, 14), resourceId: 'b', allDayRow: undefined, grabOffsetMs: 900000, grabDayOffset: undefined },
    })
    expect(dragEndToMove(drag({ event: lunch, grabDayOffset: 1 }, { date: new Date(2026, 9, 16), allDayRow: true }))?.target).toMatchObject({ allDayRow: true, grabDayOffset: 1 })
  })

  test('null without a target or without an event', () => {
    expect(dragEndToMove(drag({ eventId: 'lu' }, null))).toBeNull()
    expect(dragEndToMove(drag({}, { date: new Date() }))).toBeNull()
  })
})

const rect = (left: number, width: number): ClientRect => ({ left, width, top: 0, height: 20, right: left + width, bottom: 20 })
const container = (id: string): DroppableContainer =>
  ({ id, key: id, data: { current: {} }, disabled: false, node: { current: null }, rect: { current: null } }) as unknown as DroppableContainer
const cells = ['mon', 'tue', 'wed']
const args = (data: Record<string, unknown>, pointerX: number): Parameters<CollisionDetection>[0] => ({
  active: { id: 'a', data: { current: data }, rect: { current: { initial: null, translated: null } } },
  collisionRect: rect(0, 100),
  droppableRects: new Map(cells.map((id, i) => [id, rect(i * 100, 100)])),
  droppableContainers: cells.map(container),
  pointerCoordinates: { x: pointerX, y: 10 },
})

describe('dayAwareCollision', () => {
  test('an all-day bar targets the cell under the pointer; timed events keep the overlay detection', () => {
    expect(dayAwareCollision(args({ grabDayOffset: 2 }, 250))[0].id).toBe('wed')
    expect(dayAwareCollision(args({ grabOffsetMs: 0 }, 250))[0].id).toBe('mon')
  })
})

describe('CalendarDndContext and hooks', () => {
  function Event({ event }: { event: CalendarEvent }) {
    const { attributes, listeners, setNodeRef } = useDraggableEvent(event)
    return <div ref={setNodeRef} {...attributes} {...listeners}>{event.title}</div>
  }
  function Slot({ date }: { date: Date }) {
    const { setNodeRef } = useDroppableSlot(date)
    return <div ref={setNodeRef} data-testid="slot" />
  }
  function Ghost() {
    return <span>{useActiveDrag()?.title ?? 'idle'}</span>
  }

  test('renders draggables and droppables with the data contract, and no active drag at rest', () => {
    const calendar = createCalendar({ events: [lunch], now })
    render(<CalendarDndContext calendar={calendar}><Event event={lunch} /><Slot date={new Date(2026, 9, 16, 14)} /><Ghost /></CalendarDndContext>)
    expect(screen.getByText('Lunch').getAttribute('role')).toBe('button')
    expect(screen.getByText('idle')).toBeTruthy()
  })
})
