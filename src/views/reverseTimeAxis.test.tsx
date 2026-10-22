// Spec §2 (B), issue #2: `reverseTimeAxis` puts the latest hours on top of the week and day grids.
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { DndContext } from '@dnd-kit/core'
import { Scheduler } from '../index'
import type { CalendarEvent } from '../types'
import { ResizableEvent } from '../components/dnd/ResizableEvent'
import { resolveTimeGrid } from './grid'
import { WeekView } from './WeekView'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const day = new Date(2026, 9, 15)
const at = (hour: number, minute = 0) => new Date(2026, 9, 15, hour, minute)
const block = (title: string) => screen.getByText(title).closest('[aria-roledescription="draggable"]') as HTMLElement
const scrollTopOf = (container: HTMLElement) => (container.querySelector('.ck\\:overflow-y-auto') as HTMLElement).scrollTop

describe('reversed time axis', () => {
  test('events are placed from the bottom: 9:00 to 10:00 sits 9 hours above the bottom edge', () => {
    render(<Scheduler view="day" date={day} events={[{ id: 'a', title: 'Standup', start: at(9), end: at(10) }]} reverseTimeAxis />)
    expect(block('Standup').style.bottom).toBe(`${9 * 80}px`)
    expect(block('Standup').style.top).toBe('')
    expect(block('Standup').style.height).toBe('80px')
  })

  test('hours run bottom to top: rows stay in time order and are drawn reversed, slots anchored at the bottom', () => {
    const { container } = render(<Scheduler view="day" date={day} events={[]} reverseTimeAxis />)
    const firstSlot = container.querySelector<HTMLElement>('.ck\\:z-0.ck\\:cursor-pointer')!
    expect(firstSlot.style.bottom).toBe('0%')
    expect(firstSlot.parentElement!.parentElement!.className).toContain('ck:flex-col-reverse')
  })

  test('with the visible hours, 18:00 is the top edge', () => {
    render(<Scheduler view="day" date={day} events={[{ id: 'a', title: 'Late', start: at(17), end: at(18) }]} dayStartHour={8} dayEndHour={18} reverseTimeAxis />)
    expect(block('Late').style.bottom).toBe(`${9 * 80}px`)
  })

  test('the grid opens with now a few hours below the top', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(at(10))
    const { container } = render(<DndContext><WeekView currentDate={day} events={[]} grid={resolveTimeGrid({ reverseTimeAxis: true })} /></DndContext>)
    expect(scrollTopOf(container)).toBe((24 - (10 + 4)) * 60)
  })

  test('the resize handle is on the top edge and dragging it up makes the event longer', () => {
    const event: CalendarEvent = { id: 'e', title: 'e', start: at(9), end: at(10) }
    const onResize = vi.fn()
    const { container } = render(<ResizableEvent event={event} hourHeight={60} reverse onResize={onResize}><span>e</span></ResizableEvent>)
    const handle = container.querySelector<HTMLElement>('.ck\\:cursor-ns-resize')!
    expect(handle.className).toContain('ck:top-0')
    fireEvent.mouseDown(handle, { clientY: 100 })
    fireEvent.mouseMove(document, { clientY: 70 })
    fireEvent.mouseUp(document)
    expect(onResize).toHaveBeenCalledWith(event, at(10, 30))
  })
})
