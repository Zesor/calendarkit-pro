// Spec §2 (B): `dayStartHour` / `dayEndHour` limit the hours drawn by the week, day and resource views.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { DndContext } from '@dnd-kit/core'
import { Scheduler } from '../index'
import type { CalendarEvent } from '../types'
import { resolveTimeGrid } from './grid'
import { WeekView } from './WeekView'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const day = new Date(2026, 9, 15)
const at = (hour: number, minute = 0) => new Date(2026, 9, 15, hour, minute)
const slots = (container: HTMLElement) => container.querySelectorAll<HTMLElement>('.ck\\:z-0.ck\\:cursor-pointer')
const block = (title: string) => screen.getByText(title).closest('[aria-roledescription="draggable"]') as HTMLElement
const scrollTopOf = (container: HTMLElement) => (container.querySelector('.ck\\:overflow-y-auto') as HTMLElement).scrollTop

function quickCreate(slot: HTMLElement, title: string) {
  act(() => slot.click())
  const box = screen.getByRole('textbox', { name: 'Add title' })
  fireEvent.change(box, { target: { value: title } })
  fireEvent.keyDown(box, { key: 'Enter' })
}

describe('visible hours', () => {
  test('resolveTimeGrid keeps the hours inside the day and at least one hour long', () => {
    expect(resolveTimeGrid({})).toMatchObject({ startHour: 0, endHour: 24 })
    expect(resolveTimeGrid({ dayStartHour: -3, dayEndHour: 30 })).toMatchObject({ startHour: 0, endHour: 24 })
    expect(resolveTimeGrid({ dayStartHour: 20, dayEndHour: 10 })).toMatchObject({ startHour: 20, endHour: 21 })
    expect(resolveTimeGrid({ dayStartHour: 7.5, dayEndHour: 18.5 })).toMatchObject({ startHour: 7, endHour: 19 })
    expect(resolveTimeGrid({ dayStartHour: NaN, dayEndHour: NaN })).toMatchObject({ startHour: 0, endHour: 24 })
  })

  test('day view: the grid runs from 8:00 to 18:00 and its first slot is 8:00', () => {
    const onEventCreate = vi.fn()
    const { container } = render(<Scheduler view="day" date={day} events={[]} dayStartHour={8} dayEndHour={18} onEventCreate={onEventCreate} />)
    expect(slots(container)).toHaveLength(10 * 4)
    quickCreate(slots(container)[0], 'Early')
    expect(onEventCreate).toHaveBeenCalledWith(expect.objectContaining({ title: 'Early', start: at(8) }))
  })

  test('week view: 7 columns of 8:00 to 18:00', () => {
    const { container } = render(<Scheduler view="week" date={day} events={[]} dayStartHour={8} dayEndHour={18} />)
    expect(slots(container)).toHaveLength(7 * 10 * 4)
  })

  test('events are cut at the visible hours, and events outside them are not drawn', () => {
    const events: CalendarEvent[] = [
      { id: 'a', title: 'Before and in', start: at(7), end: at(9) },
      { id: 'b', title: 'In and after', start: at(17, 30), end: at(19) },
      { id: 'c', title: 'Evening', start: at(19), end: at(20) },
    ]
    render(<Scheduler view="day" date={day} events={events} dayStartHour={8} dayEndHour={18} />)
    expect(block('Before and in').style.top).toBe('0px')
    expect(block('Before and in').style.height).toBe('80px')
    expect(block('In and after').style.top).toBe(`${9.5 * 80}px`)
    expect(block('In and after').style.height).toBe('40px')
    expect(screen.queryByText('Evening')).toBeNull()
  })

  test('the opening scroll counts from the first visible hour', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(at(14))
    const { container } = render(<DndContext><WeekView currentDate={day} events={[]} grid={resolveTimeGrid({ dayStartHour: 8 })} /></DndContext>)
    expect(scrollTopOf(container)).toBe((14 - 4 - 8) * 60)
  })

  test('resource view: the timeline starts at the first visible hour', () => {
    const events: CalendarEvent[] = [{ id: 'r', title: 'Booked', start: at(9), end: at(10), resourceId: 'room' }]
    const { container } = render(<Scheduler view="resource" date={day} events={events} resources={[{ id: 'room', label: 'Room' }]} dayStartHour={8} dayEndHour={18} />)
    expect(container.querySelectorAll('.ck\\:flex-1.ck\\:cursor-pointer')).toHaveLength(10 * 4)
    expect(block('Booked').style.left).toBe('100px')
  })
})
