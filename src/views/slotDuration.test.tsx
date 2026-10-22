// Spec §2 (B): `slotDuration` sets the length of a time slot: clicks, drops and resizes snap to it.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { Scheduler } from '../index'
import type { CalendarEvent } from '../types'
import { ResizableEvent } from '../components/dnd/ResizableEvent'
import { resolveTimeGrid } from './grid'

afterEach(cleanup)

const day = new Date(2026, 9, 15)
const at = (hour: number, minute = 0) => new Date(2026, 9, 15, hour, minute)
const slots = (container: HTMLElement) => container.querySelectorAll<HTMLElement>('.ck\\:z-0.ck\\:cursor-pointer')

describe('slot duration', () => {
  test('resolveTimeGrid accepts the lengths that divide an hour, 15 minutes otherwise', () => {
    expect(resolveTimeGrid({}).slotMinutes).toBe(15)
    expect([5, 10, 15, 20, 30, 60].map((slotDuration) => resolveTimeGrid({ slotDuration }).slotMinutes)).toEqual([5, 10, 15, 20, 30, 60])
    expect([7, 0, -15, 45, 90, NaN].map((slotDuration) => resolveTimeGrid({ slotDuration }).slotMinutes)).toEqual([15, 15, 15, 15, 15, 15])
  })

  test('day view: half-hour slots, the 20th one opens quick create at 9:30', () => {
    const onEventCreate = vi.fn()
    const { container } = render(<Scheduler view="day" date={day} events={[]} slotDuration={30} onEventCreate={onEventCreate} />)
    expect(slots(container)).toHaveLength(24 * 2)
    act(() => slots(container)[19].click())
    const box = screen.getByRole('textbox', { name: 'Add title' })
    fireEvent.change(box, { target: { value: 'Call' } })
    fireEvent.keyDown(box, { key: 'Enter' })
    expect(onEventCreate).toHaveBeenCalledWith(expect.objectContaining({ title: 'Call', start: at(9, 30) }))
  })

  test('week and resource views: one slot per hour with slotDuration 60', () => {
    const { container, unmount } = render(<Scheduler view="week" date={day} events={[]} slotDuration={60} />)
    expect(slots(container)).toHaveLength(7 * 24)
    unmount()
    const resource = render(<Scheduler view="resource" date={day} events={[]} resources={[{ id: 'room', label: 'Room' }]} slotDuration={60} />)
    expect(resource.container.querySelectorAll('.ck\\:flex-1.ck\\:cursor-pointer')).toHaveLength(24)
  })

  test('resizing snaps to the slot: 20 px at 60 px per hour is a 30-minute step', () => {
    const event: CalendarEvent = { id: 'e', title: 'e', start: at(9), end: at(10) }
    const onResize = vi.fn()
    const { container } = render(<ResizableEvent event={event} hourHeight={60} snapMinutes={30} onResize={onResize}><span>e</span></ResizableEvent>)
    fireEvent.mouseDown(container.querySelector('.ck\\:cursor-ns-resize')!, { clientY: 100 })
    fireEvent.mouseMove(document, { clientY: 120 })
    fireEvent.mouseUp(document)
    expect(onResize).toHaveBeenCalledWith(event, at(10, 30))
  })
})
