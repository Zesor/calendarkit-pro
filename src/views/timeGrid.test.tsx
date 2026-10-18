import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { DndContext } from '@dnd-kit/core'
import type { CalendarEvent } from '../types'
import * as eventsModule from '../core/events'
import { WeekView } from './WeekView'
import { DayView } from './DayView'
import { ResourceView } from './ResourceView'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const freeze = (date: Date) => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(date)
}

const scrollTopOf = (container: HTMLElement) => (container.querySelector('.ck\\:overflow-y-auto') as HTMLElement).scrollTop

describe('time grids', () => {
  test('T3: the week view scrolls relative to the current time in the display zone', () => {
    freeze(new Date('2026-10-15T08:00:00Z')) // 10:00 Paris, 17:00 Tokyo
    const { container } = render(
      <DndContext><WeekView currentDate={new Date(2026, 9, 15)} events={[]} timezone="Asia/Tokyo" /></DndContext>,
    )
    expect(scrollTopOf(container)).toBe((17 - 4) * 60)
  })

  test('T2: "today" is highlighted in the display zone', () => {
    freeze(new Date('2026-10-17T21:30:00Z')) // Sat 23:30 Paris, Sun 18 Oct 06:30 Tokyo
    render(<DndContext><WeekView currentDate={new Date(2026, 9, 17)} events={[]} timezone="Asia/Tokyo" /></DndContext>)
    const highlighted = screen.getAllByText(/^\d+$/).filter((el) => el.className.includes('bg-primary'))
    expect(highlighted.map((el) => el.textContent)).toEqual(['18'])
  })

  test('T4/T5: overlapping events sit side by side and a night event is split across two days', () => {
    const events: CalendarEvent[] = [
      { id: 'a', title: 'A', start: new Date(2026, 9, 15, 9), end: new Date(2026, 9, 15, 10) },
      { id: 'b', title: 'B', start: new Date(2026, 9, 15, 9, 30), end: new Date(2026, 9, 15, 10, 30) },
      { id: 'n', title: 'Night', start: new Date(2026, 9, 15, 22), end: new Date(2026, 9, 16, 2) },
    ]
    render(<DndContext><WeekView currentDate={new Date(2026, 9, 15)} events={events} /></DndContext>)
    const block = (title: string) => screen.getAllByText(title).map((el) => el.closest('[aria-roledescription="draggable"]') as HTMLElement)
    expect(block('A')[0].style.width).toBe('50%')
    expect(block('B')[0].style.left).toBe('50%')
    expect(block('Night')).toHaveLength(2)
    expect(block('Night').map((el) => el.style.height)).toEqual(['120px', '120px'])
  })

  test('C6: re-rendering the parent with the same props does not re-render the week grid', () => {
    // segmentsByDisplayDay runs once per WeekView render: a stable count means the memo held.
    const segments = vi.spyOn(eventsModule, 'segmentsByDisplayDay')
    const events: CalendarEvent[] = []
    const date = new Date(2026, 9, 15)
    const onSlot = () => {}
    const Harness = ({ tick }: { tick: number }) => (
      <DndContext>
        <span>{tick}</span>
        <WeekView currentDate={date} events={events} onTimeSlotClick={onSlot} />
      </DndContext>
    )
    const { rerender } = render(<Harness tick={0} />)
    expect(segments).toHaveBeenCalledTimes(1)
    rerender(<Harness tick={1} />)
    expect(segments).toHaveBeenCalledTimes(1)
  })

  test('the day view renders its events in the display zone', () => {
    const events: CalendarEvent[] = [{ id: 'a', title: 'Call', start: new Date('2026-10-15T14:00:00Z'), end: new Date('2026-10-15T15:00:00Z') }]
    render(<DndContext><DayView currentDate={new Date(2026, 9, 15)} events={events} timezone="Asia/Tokyo" /></DndContext>)
    const block = screen.getByText('Call').closest('[aria-roledescription="draggable"]') as HTMLElement
    expect(block.style.top).toBe(`${23 * 80}px`)
  })

  test('clicking a resource slot reports its date and resource', () => {
    const onTimeSlotClick = vi.fn()
    const { container } = render(
      <DndContext>
        <ResourceView currentDate={new Date(2026, 9, 15)} events={[]} resources={[{ id: 'room-a', label: 'Room A' }]} onTimeSlotClick={onTimeSlotClick} />
      </DndContext>,
    )
    fireEvent.click(container.querySelectorAll('.ck\\:cursor-pointer')[36]) // 09:00 = 9 hours × 4 quarters
    expect(onTimeSlotClick).toHaveBeenCalledWith(new Date(2026, 9, 15, 9, 0), 'room-a')
  })
})
