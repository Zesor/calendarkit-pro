// Spec §2 (B): dragging over free time opens quick create with that range (`openSlot(start, { end })`).
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { Scheduler } from '../index'
import type { CalendarEvent } from '../types'

afterEach(cleanup)

const day = new Date(2026, 9, 15)
const at = (hour: number, minute = 0) => new Date(2026, 9, 15, hour, minute)
const HOUR = 80 // day view
const slots = (container: HTMLElement) => container.querySelectorAll<HTMLElement>('.ck\\:z-0.ck\\:cursor-pointer')
const columnOf = (container: HTMLElement) => slots(container)[0].parentElement!.parentElement!
const ghost = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-ck-ghost]')

// jsdom has no layout: the column's box is set by hand, 24 hours of 80 px from y = 0.
function layout(container: HTMLElement) {
  vi.spyOn(columnOf(container), 'getBoundingClientRect').mockReturnValue({ top: 0, bottom: 24 * HOUR, left: 0, right: 300, width: 300, height: 24 * HOUR, x: 0, y: 0, toJSON: () => ({}) })
}

function drag(container: HTMLElement, fromY: number, toY: number, pointerType = 'mouse') {
  fireEvent.pointerDown(slots(container)[0], { clientY: fromY, button: 0, pointerType })
  fireEvent.pointerMove(document, { clientY: toY, pointerType, buttons: 1 })
}

function save(title: string) {
  const box = screen.getByRole('textbox', { name: 'Add title' })
  fireEvent.change(box, { target: { value: title } })
  fireEvent.keyDown(box, { key: 'Enter' })
}

describe('drag to create', () => {
  test('9:05 to 10:50 draws the range from 9:00 to 11:00, then quick create opens with it', () => {
    const onEventCreate = vi.fn()
    const { container } = render(<Scheduler view="day" date={day} events={[]} onEventCreate={onEventCreate} />)
    layout(container)
    drag(container, 9 * HOUR + 7, 10 * HOUR + 70)
    expect(ghost(container)!.style.top).toBe(`${9 * HOUR}px`)
    expect(ghost(container)!.style.height).toBe(`${2 * HOUR}px`)
    act(() => { fireEvent.pointerUp(document) })
    save('Workshop')
    expect(onEventCreate).toHaveBeenCalledWith(expect.objectContaining({ title: 'Workshop', start: at(9), end: at(11) }))
  })

  test('dragging upward selects the same range', () => {
    const onEventCreate = vi.fn()
    const { container } = render(<Scheduler view="day" date={day} events={[]} onEventCreate={onEventCreate} />)
    layout(container)
    drag(container, 10 * HOUR + 70, 9 * HOUR + 7)
    act(() => { fireEvent.pointerUp(document) })
    save('Workshop')
    expect(onEventCreate).toHaveBeenCalledWith(expect.objectContaining({ start: at(9), end: at(11) }))
  })

  test('the range snaps to slotDuration and follows a reversed axis (y counted from the bottom)', () => {
    const onEventCreate = vi.fn()
    const { container } = render(<Scheduler view="day" date={day} events={[]} slotDuration={30} reverseTimeAxis onEventCreate={onEventCreate} />)
    layout(container)
    drag(container, 24 * HOUR - (14 * HOUR + 10), 24 * HOUR - (15 * HOUR + 50))
    act(() => { fireEvent.pointerUp(document) })
    save('Review')
    expect(onEventCreate).toHaveBeenCalledWith(expect.objectContaining({ start: at(14), end: at(16) }))
  })

  test('a cancelled pointer (the browser took over the gesture) creates nothing', () => {
    const { container } = render(<Scheduler view="day" date={day} events={[]} />)
    layout(container)
    drag(container, 9 * HOUR, 11 * HOUR)
    expect(ghost(container)).not.toBeNull()
    act(() => { fireEvent.pointerCancel(document) })
    expect(ghost(container)).toBeNull()
    expect(screen.queryByRole('textbox', { name: 'Add title' })).toBeNull()
  })

  test('a move with no button down (the release was lost, e.g. ctrl+click menu) ends the gesture and creates nothing', () => {
    const { container } = render(<Scheduler view="day" date={day} events={[]} />)
    layout(container)
    drag(container, 9 * HOUR, 11 * HOUR)
    expect(ghost(container)).not.toBeNull()
    act(() => { fireEvent.pointerMove(document, { clientY: 12 * HOUR, pointerType: 'mouse', buttons: 0 }) })
    expect(ghost(container)).toBeNull()
    act(() => { fireEvent.pointerUp(document) })
    expect(screen.queryByRole('textbox', { name: 'Add title' })).toBeNull()
  })

  test('a jitter of a few pixels across a slot edge stays a click', () => {
    const { container } = render(<Scheduler view="day" date={day} events={[]} />)
    layout(container)
    drag(container, 9 * HOUR + 18, 9 * HOUR + 21)
    expect(ghost(container)).toBeNull()
    act(() => { fireEvent.pointerUp(document) })
    expect(screen.queryByRole('textbox', { name: 'Add title' })).toBeNull()
  })

  test('a press on the locked resize handle of a cut event starts no range', () => {
    const events: CalendarEvent[] = [{ id: 'late', title: 'Late', start: at(17), end: at(19) }]
    const { container } = render(<Scheduler view="day" date={day} events={events} dayEndHour={18} />)
    layout(container)
    const handle = screen.getByText('Late').closest('[data-ck-drag]')!.querySelector<HTMLElement>('.ck\\:h-3')!
    expect(handle.className).toContain('ck:cursor-default')
    fireEvent.pointerDown(handle, { clientY: 17 * HOUR + 75, button: 0, pointerType: 'mouse' })
    fireEvent.pointerMove(document, { clientY: 15 * HOUR, pointerType: 'mouse', buttons: 1 })
    expect(ghost(container)).toBeNull()
    fireEvent.pointerUp(document)
  })

  test('a press without a move is a plain click: one slot, the default hour', () => {
    const onEventCreate = vi.fn()
    const { container } = render(<Scheduler view="day" date={day} events={[]} onEventCreate={onEventCreate} />)
    layout(container)
    fireEvent.pointerDown(slots(container)[36], { clientY: 9 * HOUR + 7, button: 0, pointerType: 'mouse' })
    fireEvent.pointerUp(document)
    act(() => slots(container)[36].click())
    save('Call')
    expect(onEventCreate).toHaveBeenCalledWith(expect.objectContaining({ start: at(9), end: at(10) }))
  })

  test('no range from touch (it scrolls), from an event, or in read-only mode', () => {
    const events: CalendarEvent[] = [{ id: 'a', title: 'Standup', start: at(9), end: at(10) }]
    const { container, unmount } = render(<Scheduler view="day" date={day} events={events} />)
    layout(container)
    drag(container, 12 * HOUR, 14 * HOUR, 'touch')
    expect(ghost(container)).toBeNull()
    fireEvent.pointerDown(screen.getByText('Standup'), { clientY: 9 * HOUR + 7, button: 0, pointerType: 'mouse' })
    fireEvent.pointerMove(document, { clientY: 12 * HOUR, pointerType: 'mouse', buttons: 1 })
    expect(ghost(container)).toBeNull()
    fireEvent.pointerUp(document)
    unmount()
    const readOnly = render(<Scheduler view="day" date={day} events={[]} readOnly />)
    const cell = readOnly.container.querySelector<HTMLElement>('.ck\\:z-0.ck\\:absolute')!
    fireEvent.pointerDown(cell, { clientY: 9 * HOUR, button: 0, pointerType: 'mouse' })
    fireEvent.pointerMove(document, { clientY: 12 * HOUR, pointerType: 'mouse', buttons: 1 })
    expect(ghost(readOnly.container)).toBeNull()
  })

  test('week view: the range stays in the column where it started', () => {
    const onEventCreate = vi.fn()
    const { container } = render(<Scheduler view="week" date={day} events={[]} onEventCreate={onEventCreate} />)
    const thursday = slots(container)[3 * 96].parentElement!.parentElement!
    vi.spyOn(thursday, 'getBoundingClientRect').mockReturnValue({ top: 0, bottom: 24 * 60, left: 0, right: 100, width: 100, height: 24 * 60, x: 0, y: 0, toJSON: () => ({}) })
    fireEvent.pointerDown(slots(container)[3 * 96 + 32], { clientY: 8 * 60, button: 0, pointerType: 'mouse' })
    fireEvent.pointerMove(document, { clientY: 9 * 60 + 20, clientX: 500, pointerType: 'mouse', buttons: 1 })
    act(() => { fireEvent.pointerUp(document) })
    save('Focus')
    expect(onEventCreate).toHaveBeenCalledWith(expect.objectContaining({ start: at(8), end: at(9, 30) }))
  })
})
