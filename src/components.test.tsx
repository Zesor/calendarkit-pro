// Spec §7: `components` replaces parts of the Scheduler with the host's own (EventContent,
// EventEditor, Toolbar, Sidebar, EmptyState); `renderEventForm` stays and equals EventEditor.
import { act, cleanup, render, screen } from '@testing-library/react'
import { addDays, format, startOfDay } from 'date-fns'
import React from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { Scheduler } from './index'
import type { CalendarEvent, EventContentProps, EventEditorProps, SidebarProps, ToolbarProps } from './types'
import { todayAt } from './test/time'

afterEach(cleanup)

const today = startOfDay(new Date())
const standup: CalendarEvent = { id: 'su', title: 'Standup', start: todayAt(9.5), end: todayAt(10) }
const offsite: CalendarEvent = { id: 'off', title: 'Offsite', start: today, end: addDays(today, 1), allDay: true }
const EventContent = ({ event, variant }: EventContentProps) => <b>{`${variant}: ${event.title}`}</b>

describe('components', () => {
  test('EventContent draws the inside of blocks, bars and month chips', () => {
    const { rerender } = render(<Scheduler view="week" date={today} events={[standup, offsite]} components={{ EventContent }} />)
    expect(screen.getByText('block: Standup').closest('.ck-event')).toBeTruthy()
    expect(screen.getByText('bar: Offsite').closest('.ck-event')).toBeTruthy()
    rerender(<Scheduler view="month" date={today} events={[standup]} components={{ EventContent }} />)
    expect(screen.getByText('chip: Standup')).toBeTruthy()
  })

  test('Toolbar replaces the header, and its callbacks drive the calendar', () => {
    const Toolbar = ({ date, view, onNext, onViewChange }: ToolbarProps) => (
      <div>
        <span>{`${view} ${format(date, 'yyyy-MM-dd')}`}</span>
        <button onClick={onNext}>Later</button>
        <button onClick={() => onViewChange('month')}>Month view</button>
      </div>
    )
    render(<Scheduler components={{ Toolbar }} />)
    expect(screen.queryByRole('button', { name: 'Today' })).toBeNull()
    act(() => screen.getByRole('button', { name: 'Month view' }).click())
    const before = screen.getByText(/^month /).textContent
    act(() => screen.getByRole('button', { name: 'Later' }).click())
    expect(screen.getByText(/^month /).textContent).not.toBe(before)
  })

  // The side panel sits in a desktop-only column: queried by text (jsdom applies no media query).
  test('Sidebar replaces the panel: onCreate opens the quick card, calendars and onCalendarToggle pass through', () => {
    const onCalendarToggle = vi.fn()
    const Sidebar = ({ onCreate, calendars, onCalendarToggle: toggle }: SidebarProps) => (
      <div>
        <button onClick={onCreate}>New</button>
        {calendars?.map((c) => <button key={c.id} onClick={() => toggle?.(c.id, false)}>{`Hide ${c.label}`}</button>)}
      </div>
    )
    render(<Scheduler view="week" date={today} calendars={[{ id: 'w', label: 'Work' }]} onCalendarToggle={onCalendarToggle} components={{ Sidebar }} />)
    act(() => screen.getByText('Hide Work').click())
    expect(onCalendarToggle).toHaveBeenCalledWith('w', false)
    act(() => screen.getByText('New').click())
    expect(document.querySelector('[data-ck-layer] [role="dialog"]')).toBeTruthy()
  })

  test('EmptyState replaces the empty agenda, and onCreate opens the quick card', () => {
    const EmptyState = ({ onCreate }: { onCreate?: () => void }) => <button onClick={onCreate}>Nothing yet, add one</button>
    render(<Scheduler view="agenda" date={today} events={[]} components={{ EmptyState }} />)
    act(() => screen.getByRole('button', { name: 'Nothing yet, add one' }).click())
    expect(document.querySelector('[data-ck-layer] [role="dialog"]')).toBeTruthy()
  })

  test('EventEditor works like renderEventForm: a slot click opens it, and onSave creates the event', () => {
    const EventEditor = ({ isOpen, initialDate, onSave }: EventEditorProps) =>
      isOpen ? <button onClick={() => onSave({ title: 'From my form', start: initialDate!, end: new Date(initialDate!.getTime() + 3600e3) })}>Save mine</button> : null
    const { container } = render(<Scheduler view="day" date={today} defaultEvents={[]} components={{ EventEditor }} />)
    act(() => container.querySelectorAll<HTMLElement>('.ck\\:z-0.ck\\:cursor-pointer')[40].click())
    expect(screen.queryByRole('dialog', { name: 'New Event' })).toBeNull()
    act(() => screen.getByRole('button', { name: 'Save mine' }).click())
    expect(screen.getByText('From my form')).toBeTruthy()
  })

  test('readOnly: the custom Sidebar and EmptyState get no onCreate', () => {
    const seen: (SidebarProps['onCreate'])[] = []
    const Sidebar = ({ onCreate }: SidebarProps) => { seen.push(onCreate); return null }
    render(<Scheduler view="week" date={today} readOnly components={{ Sidebar }} />)
    expect(seen.every((f) => f === undefined)).toBe(true)
  })
})
