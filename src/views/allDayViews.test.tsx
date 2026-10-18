import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import { DndContext } from '@dnd-kit/core'
import { enUS } from 'date-fns/locale'
import type { CalendarEvent } from '../types'
import { MonthView } from './MonthView'
import { WeekView } from './WeekView'
import { DayView } from './DayView'

afterEach(cleanup)

const allDay = (id: string, from: Date, toExclusive: Date): CalendarEvent => ({ id, title: id, start: from, end: toExclusive, allDay: true })
const timed = (id: string, day: number, hour: number): CalendarEvent => ({ id, title: id, start: new Date(2026, 9, day, hour), end: new Date(2026, 9, day, hour, 30) })
const bars = (title: string) => screen.queryAllByText(title).map((el) => el.closest('[role="button"]') as HTMLElement)

describe('month view all-day bars', () => {
  test('a Mon–Wed event is one continuous bar (3/7 of the week)', () => {
    render(<DndContext><MonthView currentDate={new Date(2026, 9, 15)} events={[allDay('Conference', new Date(2026, 9, 12), new Date(2026, 9, 15))]} /></DndContext>)
    const [bar] = bars('Conference')
    expect(bars('Conference')).toHaveLength(1)
    expect(parseFloat(bar.style.width)).toBeCloseTo((3 / 7) * 100, 3)
  })

  test('weeks follow the locale: a Sun–Mon event is one bar with en-US, two with a Monday start', () => {
    const sunMon = [allDay('Retreat', new Date(2026, 9, 18), new Date(2026, 9, 20))]
    render(<DndContext><MonthView currentDate={new Date(2026, 9, 15)} events={sunMon} locale={enUS} /></DndContext>)
    expect(bars('Retreat')).toHaveLength(1)
    expect(parseFloat(bars('Retreat')[0].style.width)).toBeCloseTo((2 / 7) * 100, 3)
    cleanup()
    render(<DndContext><MonthView currentDate={new Date(2026, 9, 15)} events={sunMon} /></DndContext>)
    expect(bars('Retreat')).toHaveLength(2)
  })

  test('an event crossing two weeks is drawn as one bar per week with chevrons', () => {
    render(<DndContext><MonthView currentDate={new Date(2026, 9, 15)} events={[allDay('Holiday', new Date(2026, 9, 15), new Date(2026, 9, 22))]} /></DndContext>)
    expect(bars('Holiday')).toHaveLength(2)
    expect(screen.getByText('›')).toBeTruthy()
    expect(screen.getByText('‹')).toBeTruthy()
  })

  test('"+N more" counts hidden bars and hidden timed events of the day', () => {
    const wed = (id: string) => allDay(id, new Date(2026, 9, 14), new Date(2026, 9, 15))
    render(
      <DndContext>
        <MonthView currentDate={new Date(2026, 9, 15)} events={[wed('A'), wed('B'), wed('C'), wed('D'), timed('T1', 14, 9), timed('T2', 14, 10)]} />
      </DndContext>,
    )
    // 3 lanes leave room for 1 chip: hidden = 1 bar (D) + 1 timed (T2)
    expect(screen.getByRole('button', { name: '+2 more' })).toBeTruthy()
    expect(screen.getByText('T1')).toBeTruthy()
    expect(screen.queryByText('T2')).toBeNull()
  })

  test('timed events share the room left under the bars', () => {
    render(
      <DndContext>
        <MonthView
          currentDate={new Date(2026, 9, 15)}
          events={[allDay('Bar', new Date(2026, 9, 14), new Date(2026, 9, 15)), timed('T1', 14, 9), timed('T2', 14, 10), timed('T3', 14, 11)]}
        />
      </DndContext>,
    )
    // 1 lane leaves room for 2 chips; "+N more" sits next to the day number
    expect(screen.getByText('T2')).toBeTruthy()
    expect(screen.queryByText('T3')).toBeNull()
    expect(screen.getByRole('button', { name: '+1 more' })).toBeTruthy()
  })

  test('§8.4: without bars a day shows 3 chips, then "+N more"', () => {
    render(
      <DndContext>
        <MonthView currentDate={new Date(2026, 9, 15)} events={[9, 10, 11, 12, 13].map((h) => timed(`T${h}`, 14, h))} />
      </DndContext>,
    )
    expect(screen.getByText('T11')).toBeTruthy()
    expect(screen.queryByText('T12')).toBeNull()
    expect(screen.getByRole('button', { name: '+2 more' })).toBeTruthy()
  })

  test('a long timed event (30 h) becomes a bar instead of a chip', () => {
    const flight: CalendarEvent = { id: 'f', title: 'Flight', start: new Date(2026, 9, 14, 22), end: new Date(2026, 9, 16, 4) }
    render(<DndContext><MonthView currentDate={new Date(2026, 9, 15)} events={[flight]} /></DndContext>)
    const [bar] = bars('Flight')
    expect(bars('Flight')).toHaveLength(1)
    // Wed 22:00 → Fri 04:00 covers Wed, Thu and Fri
    expect(parseFloat(bar.style.width)).toBeCloseTo((3 / 7) * 100, 3)
  })
})

describe('week and day views', () => {
  test('all-day events are in the all-day row, not in the time grid', () => {
    const { container } = render(
      <DndContext><WeekView currentDate={new Date(2026, 9, 15)} events={[allDay('Offsite', new Date(2026, 9, 14), new Date(2026, 9, 15)), timed('Standup', 14, 9)]} /></DndContext>,
    )
    const row = container.querySelector('[data-all-day-row]') as HTMLElement
    expect(row.textContent).toContain('Offsite')
    expect(row.textContent).not.toContain('Standup')
  })

  test('the day view shows the all-day row for that day', () => {
    const { container } = render(
      <DndContext><DayView currentDate={new Date(2026, 9, 14)} events={[allDay('Offsite', new Date(2026, 9, 12), new Date(2026, 9, 20))]} /></DndContext>,
    )
    const row = container.querySelector('[data-all-day-row]') as HTMLElement
    expect(row.textContent).toContain('Offsite')
  })
})
