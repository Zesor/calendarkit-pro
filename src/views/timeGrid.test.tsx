import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { DndContext } from '@dnd-kit/core'
import type { CalendarEvent } from '../types'
import * as eventsModule from '../core/events'
import { WeekView } from './WeekView'
import { DayView } from './DayView'
import { ResourceView } from './ResourceView'
import { Scheduler } from '../index'

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
    expect(block('A')[0].style.width).toBe('calc(50% - 2px)')
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

  // Five events at the same hour: the day view shows 4 columns (3 blocks and "+2"), the week view 3
  // until it is measured (2 blocks and "+3").
  const crowd: CalendarEvent[] = ['A', 'B', 'C', 'D', 'E'].map((title, i) => ({ id: title, title, start: new Date(2026, 9, 15, 9), end: new Date(2026, 9, 15, 10, 30 - i) }))
  const blocks = () => screen.queryAllByText(/^[A-E]$/).map((el) => el.textContent)

  test('§8.4: past its column cap, a cluster shows "+N" for the rest, which reports the hidden events', () => {
    const onMoreClick = vi.fn()
    const { unmount } = render(<DndContext><DayView currentDate={new Date(2026, 9, 15)} events={crowd} onMoreClick={onMoreClick} /></DndContext>)
    expect(blocks()).toEqual(['A', 'B', 'C'])
    fireEvent.click(screen.getByRole('button', { name: '+2 more' }))
    expect(onMoreClick.mock.calls[0][0].map((e: CalendarEvent) => e.id)).toEqual(['D', 'E'])
    unmount()
    render(<DndContext><WeekView currentDate={new Date(2026, 9, 15)} events={crowd} /></DndContext>)
    expect(blocks()).toEqual(['A', 'B'])
    expect(screen.getByRole('button', { name: '+3 more' }).textContent).toBe('+3')
  })

  test('§8.4: a block stretches right while the next columns are free during its time', () => {
    const events: CalendarEvent[] = [
      { id: 'a', title: 'Long', start: new Date(2026, 9, 15, 9), end: new Date(2026, 9, 15, 12) },
      { id: 'b', title: 'Hour', start: new Date(2026, 9, 15, 9), end: new Date(2026, 9, 15, 10) },
      { id: 'c', title: 'Half', start: new Date(2026, 9, 15, 9), end: new Date(2026, 9, 15, 9, 30) },
      { id: 'd', title: 'Later', start: new Date(2026, 9, 15, 10, 30), end: new Date(2026, 9, 15, 11) },
    ]
    render(<DndContext><WeekView currentDate={new Date(2026, 9, 15)} events={events} /></DndContext>)
    const block = (title: string) => screen.getByText(title).closest('[aria-roledescription="draggable"]') as HTMLElement
    expect(block('Half').style.width).toMatch(/^calc\(33\.33+\d*% - 2px\)$/)
    expect(block('Later').style.left).toMatch(/^33\.33+\d*%$/)
    expect(block('Later').style.width).toMatch(/^calc\(66\.66+\d*% - 2px\)$/)
  })

  test('"+N" in the Scheduler opens the list of hidden events; each one opens its event', () => {
    const onEventClick = vi.fn()
    render(<Scheduler view="day" date={new Date(2026, 9, 15)} events={crowd} onEventClick={onEventClick} />)
    act(() => screen.getByRole('button', { name: '+2 more' }).click())
    expect(screen.getByText('2 events')).toBeTruthy()
    act(() => screen.getByRole('button', { name: /^9:00 AM – 10:27 AM\s*D$/ }).click())
    expect(onEventClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'D' }))
    expect(screen.queryByText('2 events')).toBeNull()
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
