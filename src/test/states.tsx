// The Scheduler's visible states, for tests that inspect everything it can render.
import { act, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { Scheduler } from '../index'
import type { CalendarEvent, CalendarProps } from '../types'

const events: CalendarEvent[] = [
  { id: 'rv', title: 'Design review', start: new Date(2026, 9, 14, 10), end: new Date(2026, 9, 14, 11), calendarId: 'work', resourceId: 'a' },
  { id: 'su', title: 'Standup', start: new Date(2026, 9, 12, 9), end: new Date(2026, 9, 12, 9, 15), recurrence: { freq: 'WEEKLY' }, resourceId: 'b' },
  { id: 'off', title: 'Offsite', start: new Date(2026, 9, 15), end: new Date(2026, 9, 16), allDay: true },
]
const props: Partial<CalendarProps> = {
  events,
  date: new Date(2026, 9, 14),
  calendars: [{ id: 'work', label: 'Work', color: '#2f6fed', active: true }],
  resources: [{ id: 'a', label: 'Room A' }, { id: 'b', label: 'Room B' }],
}

/** [label, render the state into document.body] */
export const SCHEDULER_STATES: Array<[string, () => void]> = [
  ...(['month', 'week', 'day', 'agenda', 'resource'] as const).map((view): [string, () => void] => [`${view} view`, () => void render(<Scheduler {...props} view={view} />)]),
  ...(['month', 'week', 'day', 'agenda'] as const).map((view): [string, () => void] => [`${view} skeleton`, () => void render(<Scheduler {...props} view={view} isLoading />)]),
  ['empty agenda', () => void render(<Scheduler view="agenda" date={new Date(2026, 9, 14)} />)],
  ['event dialog', () => {
    render(<Scheduler {...props} view="week" />)
    act(() => screen.getByText('Design review').click())
  }],
  ['new event dialog', () => {
    render(<Scheduler {...props} view="week" />)
    act(() => screen.getByRole('button', { name: 'Create', hidden: true }).click())
  }],
  ['more events list', () => {
    const crowd: CalendarEvent[] = ['A', 'B', 'C', 'D', 'E'].map((title) => ({ id: title, title, start: new Date(2026, 9, 14, 9), end: new Date(2026, 9, 14, 10) }))
    render(<Scheduler {...props} events={crowd} view="day" />)
    act(() => screen.getByRole('button', { name: '+2 more' }).click())
  }],
  ['quick create', () => {
    const { container } = render(<Scheduler {...props} view="day" />)
    act(() => container.querySelectorAll<HTMLElement>('.ck\\:z-0.ck\\:cursor-pointer')[36].click())
    fireEvent.change(screen.getByRole('textbox', { name: 'Add title' }), { target: { value: 'Lunch tomorrow 1pm' } })
    fireEvent.keyDown(document, { key: 'Escape' })
  }],
  ['undo toast', () => {
    render(<Scheduler {...props} view="week" />)
    fireEvent.contextMenu(screen.getByText('Design review'))
    act(() => screen.getByRole('button', { name: /Delete/ }).click())
  }],
  ['context menu', () => {
    render(<Scheduler {...props} view="week" />)
    fireEvent.contextMenu(screen.getByText('Design review'))
  }],
]

/** Every element's class list in the rendered page. */
export const classLists = (root: ParentNode = document.body): string[] =>
  [...root.querySelectorAll('[class]')].map((el) => el.getAttribute('class')!.trim()).filter(Boolean)
