// Spec §3, §7: `defaultEvents` + `onEventsChange` let the Scheduler keep the list itself
// (uncontrolled); `events` keeps the 1.x controlled mode unchanged.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { startOfDay } from 'date-fns'
import React from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { Scheduler } from './index'
import type { CalendarEvent } from './types'

afterEach(cleanup)

const today = startOfDay(new Date())
const standup: CalendarEvent = { id: 'su', title: 'Standup', start: new Date(today.getTime() + 9.5 * 3600e3), end: new Date(today.getTime() + 10 * 3600e3) }
const slots = (container: HTMLElement) => container.querySelectorAll<HTMLElement>('.ck\\:z-0.ck\\:cursor-pointer')
const titleBox = () => screen.getByRole('textbox', { name: 'Add title' })

function quickCreate(container: HTMLElement, title: string) {
  act(() => slots(container)[44].click())
  fireEvent.change(titleBox(), { target: { value: title } })
  fireEvent.keyDown(titleBox(), { key: 'Enter' })
}

describe('uncontrolled events', () => {
  test('defaultEvents are shown, a created event appears and onEventsChange gets the whole list', () => {
    const onEventsChange = vi.fn()
    const { container } = render(<Scheduler view="day" date={today} defaultEvents={[standup]} onEventsChange={onEventsChange} />)
    expect(screen.getByText('Standup')).toBeTruthy()
    quickCreate(container, 'Call Bob')
    expect(screen.getByText('Call Bob').closest('.ck-event')).toBeTruthy()
    const list: CalendarEvent[] = onEventsChange.mock.lastCall![0]
    expect(list.map((e) => e.title)).toEqual(['Standup', 'Call Bob'])
  })

  test('the event just created is outlined, and Undo takes it out of the grid and the list', () => {
    const onEventsChange = vi.fn()
    const { container } = render(<Scheduler view="day" date={today} defaultEvents={[standup]} onEventsChange={onEventsChange} />)
    quickCreate(container, 'Call Bob')
    expect(screen.getByText('Call Bob').closest('.ck-event')!.className).toContain('ck:animate-landed')
    act(() => screen.getByRole('button', { name: 'Undo' }).click())
    expect(screen.queryByText('Call Bob')).toBeNull()
    expect(onEventsChange.mock.lastCall![0].map((e: CalendarEvent) => e.title)).toEqual(['Standup'])
  })

  test('a delete from the event menu removes the event without any host code', () => {
    render(<Scheduler view="day" date={today} defaultEvents={[standup]} />)
    fireEvent.contextMenu(screen.getByText('Standup'))
    act(() => screen.getByRole('button', { name: /Delete/ }).click())
    expect(screen.queryByText('Standup')).toBeNull()
  })

  test('with events (1.x, controlled) the list stays the host\'s: defaultEvents is ignored and nothing is added by itself', () => {
    const onEventCreate = vi.fn()
    const { container } = render(<Scheduler view="day" date={today} events={[standup]} defaultEvents={[{ ...standup, id: 'x', title: 'Ignored' }]} onEventCreate={onEventCreate} />)
    expect(screen.queryByText('Ignored')).toBeNull()
    quickCreate(container, 'Call Bob')
    expect(onEventCreate).toHaveBeenCalledWith(expect.objectContaining({ title: 'Call Bob' }))
    expect(screen.queryByText('Call Bob')).toBeNull()
  })
})
