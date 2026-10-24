// Spec §2 (B): `workingHours` shades the time outside working hours; `scrollToHour` sets where the grid opens.
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { DndContext } from '@dnd-kit/core'
import * as eventsModule from '../core/events'
import { Scheduler } from '../index'
import type { CalendarEvent } from '../types'
import { resolveTimeGrid } from './grid'
import { DayView } from './DayView'
import { WeekView } from './WeekView'
import { css } from '../styles/css.generated'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const thursday = new Date(2026, 9, 15)
const shades = (container: HTMLElement) => [...container.querySelectorAll<HTMLElement>('.ck-off-hours')]
const box = (el: HTMLElement) => [el.style.top, el.style.height]
const scrollTopOf = (container: HTMLElement) => (container.querySelector('.ck\\:overflow-y-auto') as HTMLElement).scrollTop

describe('working hours', () => {
  test('without workingHours nothing is shaded', () => {
    const { container } = render(<Scheduler view="week" date={thursday} events={[]} />)
    expect(shades(container)).toHaveLength(0)
  })

  test('week view: before and after work on weekdays, the whole weekend', () => {
    const { container } = render(<Scheduler view="week" date={thursday} events={[]} workingHours={{ start: 9, end: 17.5 }} />)
    // Monday to Friday: two shaded bands each; Saturday and Sunday: one band over the whole day.
    expect(shades(container)).toHaveLength(5 * 2 + 2)
    expect(shades(container).slice(0, 2).map(box)).toEqual([['0px', '540px'], [`${17.5 * 60}px`, `${6.5 * 60}px`]])
    expect(box(shades(container)[10])).toEqual(['0px', `${24 * 60}px`])
  })

  test('the bands mark where work starts and ends (an edge line), so the working hours read as a band', () => {
    const { container } = render(<Scheduler view="week" date={thursday} events={[]} workingHours={{ start: 9, end: 17.5 }} />)
    expect(shades(container).slice(0, 2).map((el) => el.dataset.ckEdge)).toEqual(['start', 'end'])
    // A day off has no working hours, so no edge.
    expect(shades(container)[10].dataset.ckEdge).toBeUndefined()
    expect(css).toMatch(/\.ck-off-hours\s*\{[^}]*repeating-linear-gradient/)
    expect(css).toMatch(/\.ck-off-hours\[data-ck-edge="?start"?\]/)
  })

  test('working days can be chosen (0 is Sunday), and the bands stay inside the visible hours', () => {
    const { container } = render(<Scheduler view="day" date={thursday} events={[]} dayStartHour={8} dayEndHour={20} workingHours={{ start: 9, end: 17.5, days: [4] }} />)
    expect(shades(container).map(box)).toEqual([['0px', '80px'], [`${9.5 * 80}px`, `${2.5 * 80}px`]])
    const friday = render(<Scheduler view="day" date={new Date(2026, 9, 16)} events={[]} workingHours={{ start: 9, end: 17, days: [4] }} />)
    expect(shades(friday.container).map(box)).toEqual([['0px', `${24 * 80}px`]])
  })

  test('an inline workingHours object with the same hours does not redraw the grid', () => {
    // segmentsByDisplayDay runs once per WeekView render: a stable count means the memo held.
    const segments = vi.spyOn(eventsModule, 'segmentsByDisplayDay')
    const events: CalendarEvent[] = []
    const { rerender } = render(<Scheduler view="week" date={thursday} events={events} workingHours={{ start: 9, end: 17 }} />)
    const calls = segments.mock.calls.length
    rerender(<Scheduler view="week" date={thursday} events={events} workingHours={{ start: 9, end: 17 }} />)
    expect(segments.mock.calls.length).toBe(calls)
    rerender(<Scheduler view="week" date={thursday} events={events} workingHours={{ start: 8, end: 17 }} />)
    expect(segments.mock.calls.length).toBeGreaterThan(calls)
  })

  test('shaded time can still be clicked: the bands let the pointer through', () => {
    const { container } = render(<Scheduler view="day" date={thursday} events={[]} workingHours={{ start: 9, end: 17 }} />)
    expect(shades(container)[0].className).toContain('ck:pointer-events-none')
  })
})

describe('opening scroll', () => {
  test('scrollToHour puts that hour at the top, counted from the first visible hour', () => {
    const week = render(<DndContext><WeekView currentDate={thursday} events={[]} grid={resolveTimeGrid({ scrollToHour: 7 })} /></DndContext>)
    expect(scrollTopOf(week.container)).toBe(7 * 60)
    week.unmount()
    const day = render(<DndContext><DayView currentDate={thursday} events={[]} grid={resolveTimeGrid({ scrollToHour: 7.5, dayStartHour: 6 })} /></DndContext>)
    expect(scrollTopOf(day.container)).toBe(1.5 * 80)
  })

  test('on a reversed grid, scrollToHour is still the hour at the top', () => {
    const { container } = render(<DndContext><WeekView currentDate={thursday} events={[]} grid={resolveTimeGrid({ scrollToHour: 18, reverseTimeAxis: true })} /></DndContext>)
    expect(scrollTopOf(container)).toBe((24 - 18) * 60)
  })
})

describe('the sticky header', () => {
  // A week grid scrolled past the current time keeps the time line and its badge under the header (the
  // day view's header sits outside its scrolling area).
  const z = (el: Element) => Number(/ck:z-(\d+)/.exec(el.className)?.[1] ?? 0)
  test('week view: the day header sits above the current-time line and badge, on an opaque background', () => {
    const { container } = render(<Scheduler view="week" events={[]} />)
    const header = container.querySelector('.ck\\:sticky')!
    expect(header.className).toContain('ck:bg-background')
    const above = [...container.querySelectorAll('[class*="ck:z-"]')].filter((el) => !header.contains(el) && el.closest('.ck\\:overflow-y-auto'))
    expect(Math.max(...above.map(z))).toBeLessThan(z(header))
  })
})
