// Spec §8.1 (Classic): a click on an event opens a popover with its real date, calendar, guests
// and the actions Edit / Duplicate / Delete; the editor opens only from Edit.
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { addDays, format, startOfDay } from 'date-fns'
import React from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { Scheduler } from '../index'
import type { CalendarEvent, CalendarProps } from '../types'
import { todayAt } from '../test/time'

afterEach(cleanup)

const today = startOfDay(new Date())
const standup: CalendarEvent = {
  id: 'su', title: 'Standup', calendarId: 'w', guests: ['lea@example.com', 'bob@example.com'], description: 'Daily sync',
  start: todayAt(9.5), end: todayAt(10),
}
const calendars = [{ id: 'w', label: 'Work', color: '#2563eb' }]
const popover = () => screen.queryByRole('dialog', { name: 'Standup' })

function openStandup(props: Partial<CalendarProps> = {}) {
  const view = render(<Scheduler view="day" date={today} events={[standup]} calendars={calendars} {...props} />)
  act(() => screen.getByText('Standup').click())
  return view
}

describe('event popover', () => {
  test('a click shows the real date and time, the calendar, the guests and the description, not the editor', () => {
    const onEventClick = vi.fn()
    openStandup({ onEventClick })
    expect(onEventClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'su' }))
    const text = popover()!.textContent
    expect(text).toContain(format(today, 'EEEE d MMMM'))
    expect(text).toContain('9:30 AM – 10:00 AM · 30 min')
    expect(text).toContain('Work')
    expect(text).toContain('lea@example.com')
    expect(text).toContain('Daily sync')
    expect(screen.queryByPlaceholderText('Add title')).toBeNull()
  })

  test('an all-day event over several days shows its first and last day', () => {
    const trip: CalendarEvent = { id: 'trip', title: 'Trip', allDay: true, start: today, end: addDays(today, 3) }
    render(<Scheduler view="week" date={today} events={[trip]} />)
    act(() => screen.getByText('Trip').click())
    expect(screen.getByRole('dialog', { name: 'Trip' }).textContent).toContain(`${format(today, 'EEE d MMM')} – ${format(addDays(today, 2), 'EEE d MMM')}`)
  })

  test('a timed event across midnight shows both dates', () => {
    const night: CalendarEvent = { id: 'n', title: 'Night shift', start: todayAt(22), end: todayAt(26) }
    render(<Scheduler view="day" date={today} events={[night]} />)
    act(() => screen.getAllByText('Night shift')[0].click())
    const text = screen.getByRole('dialog', { name: 'Night shift' }).textContent
    expect(text).toContain(`${format(today, 'EEE d MMM')}, 10:00 PM –`)
    expect(text).toContain(`${format(addDays(today, 1), 'EEE d MMM')}, 2:00 AM · 4 hr`)
  })

  test('the location opens a maps search; only attachments with a safe URL are links', () => {
    const offsite: CalendarEvent = {
      ...standup, location: '10 Downing St, London',
      attachments: [
        { id: 'a', name: 'agenda.pdf', url: 'https://files.example/agenda.pdf', type: 'file' },
        { id: 'b', name: 'notes.txt', type: 'file' },
        { id: 'x', name: 'evil.txt', url: 'javascript:alert(1)', type: 'file' },
      ],
    }
    render(<Scheduler view="day" date={today} events={[offsite]} />)
    act(() => screen.getByText('Standup').click())
    const maps = screen.getByText('10 Downing St, London').closest('a')!
    expect(maps.getAttribute('href')).toBe('https://www.google.com/maps/search/?api=1&query=10%20Downing%20St%2C%20London')
    expect(maps.getAttribute('rel')).toBe('noopener noreferrer')
    expect(screen.getByText('agenda.pdf').closest('a')!.getAttribute('href')).toBe('https://files.example/agenda.pdf')
    expect(screen.getByText('notes.txt').closest('a')).toBeNull()
    expect(screen.getByText('evil.txt').closest('a')).toBeNull()
  })

  test('in French, every button has its name', () => {
    openStandup({ language: 'fr' })
    for (const name of ['Modifier', 'Dupliquer', 'Supprimer', 'Fermer']) expect(within(popover()!).getByRole('button', { name })).toBeTruthy()
  })

  test('Edit opens the full editor on the event, and saving updates it', () => {
    const onEventUpdate = vi.fn()
    openStandup({ onEventUpdate })
    act(() => within(popover()!).getByRole('button', { name: 'Edit' }).click())
    expect(popover()).toBeNull()
    const titleInput = screen.getByPlaceholderText('Add title') as HTMLInputElement
    expect(titleInput.value).toBe('Standup')
    fireEvent.change(titleInput, { target: { value: 'Standup (moved)' } })
    fireEvent.submit(titleInput.closest('form')!)
    expect(onEventUpdate).toHaveBeenCalledWith(expect.objectContaining({ id: 'su', title: 'Standup (moved)' }))
  })

  test('Duplicate and Delete act at once and are announced with Undo', () => {
    const onEventCreate = vi.fn()
    const onEventDelete = vi.fn()
    openStandup({ onEventCreate, onEventDelete })
    act(() => within(popover()!).getByRole('button', { name: 'Duplicate' }).click())
    expect(onEventCreate).toHaveBeenCalledWith(expect.objectContaining({ title: 'Standup (Copy)' }))
    expect(popover()).toBeNull()
    act(() => screen.getByText('Standup').click())
    act(() => within(popover()!).getByRole('button', { name: 'Delete' }).click())
    expect(onEventDelete).toHaveBeenCalledWith('su')
    expect(screen.getByText('“Standup” deleted')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeTruthy()
  })

  test('Escape, the close button and a click outside close it', () => {
    openStandup()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(popover()).toBeNull()
    act(() => screen.getByText('Standup').click())
    act(() => within(popover()!).getByRole('button', { name: 'Close' }).click())
    expect(popover()).toBeNull()
    act(() => screen.getByText('Standup').click())
    act(() => (document.querySelector('[data-ck-backdrop]') as HTMLElement).click())
    expect(popover()).toBeNull()
  })

  // jsdom measures nothing: the event's box and the card's height are given where a test needs them.
  const boxOf = (el: Element, box: { left: number; top: number; right: number; bottom: number }) =>
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ ...box, x: box.left, y: box.top, width: box.right - box.left, height: box.bottom - box.top, toJSON: () => ({}) } as DOMRect)

  test('it opens beside the event it belongs to: right of it, else left of it, top-aligned', () => {
    const { rerender } = render(<Scheduler view="day" date={today} events={[standup]} />)
    const block = screen.getByText('Standup').closest('.ck-event')!
    boxOf(block, { left: 100, top: 150, right: 200, bottom: 250 })
    fireEvent.pointerDown(block, { clientX: 150, clientY: 160 })
    act(() => screen.getByText('Standup').click())
    expect(popover()!.style.left).toBe('212px')
    expect(popover()!.style.top).toBe('150px')
    fireEvent.keyDown(document, { key: 'Escape' })
    rerender(<Scheduler view="day" date={today} events={[standup]} />)
    const right = window.innerWidth - 100
    boxOf(screen.getByText('Standup').closest('.ck-event')!, { left: right - 100, top: 150, right, bottom: 250 })
    fireEvent.pointerDown(screen.getByText('Standup'), { clientX: right - 50, clientY: 160 })
    act(() => screen.getByText('Standup').click())
    expect(popover()!.style.left).toBe(`${right - 100 - 340 - 12}px`)
  })

  test('without a measured event it opens next to the pointer, inside the window', () => {
    render(<Scheduler view="day" date={today} events={[standup]} />)
    fireEvent.pointerDown(screen.getByText('Standup'), { clientX: window.innerWidth - 4, clientY: 40 })
    act(() => screen.getByText('Standup').click())
    expect(parseFloat(popover()!.style.left)).toBeLessThanOrEqual(window.innerWidth - 340 - 8)
    expect(popover()!.style.top).toBe('40px')
  })

  test('it never runs off the bottom: a tall card moves up and scrolls inside the window', () => {
    const height = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(300)
    render(<Scheduler view="day" date={today} events={[standup]} />)
    fireEvent.pointerDown(screen.getByText('Standup'), { clientX: 100, clientY: window.innerHeight - 40 })
    act(() => screen.getByText('Standup').click())
    expect(popover()!.style.top).toBe(`${window.innerHeight - 300 - 8}px`)
    expect(popover()!.style.maxHeight).toBe(`${window.innerHeight - 16}px`)
    height.mockRestore()
  })

  test('a press inside the open card does not move it', () => {
    const { rerender } = render(<Scheduler view="day" date={today} events={[standup]} />)
    fireEvent.pointerDown(screen.getByText('Standup'), { clientX: 100, clientY: 40 })
    act(() => screen.getByText('Standup').click())
    fireEvent.pointerDown(popover()!, { clientX: 600, clientY: 300 })
    rerender(<Scheduler view="day" date={today} events={[{ ...standup }]} />)
    expect(popover()!.style.left).toBe('112px')
    expect(popover()!.style.top).toBe('40px')
  })

  test('reminders are listed, in the calendar\'s language', () => {
    openStandup({ events: [{ ...standup, reminders: [{ id: 'r', type: 'notification', time: 30, label: '30 minutes avant' }] }] })
    expect(popover()!.textContent).toContain('30 minutes before')
  })

  test('a recurring occurrence: Duplicate copies the series event, Delete follows the 1.x rule (the series without onOccurrenceDelete)', () => {
    const weekly: CalendarEvent = { ...standup, id: 'w', recurrence: { freq: 'DAILY' } }
    const onEventCreate = vi.fn()
    const onEventDelete = vi.fn()
    const onOccurrenceDelete = vi.fn()
    const { rerender } = render(<Scheduler view="day" date={addDays(today, 1)} events={[weekly]} onEventCreate={onEventCreate} onEventDelete={onEventDelete} />)
    act(() => screen.getByText('Standup').click())
    act(() => within(popover()!).getByRole('button', { name: 'Duplicate' }).click())
    expect(onEventCreate).toHaveBeenCalledWith(expect.objectContaining({ title: 'Standup (Copy)' }))
    act(() => screen.getByText('Standup').click())
    act(() => within(popover()!).getByRole('button', { name: 'Delete' }).click())
    expect(onEventDelete).toHaveBeenCalledWith('w')
    rerender(<Scheduler view="day" date={addDays(today, 1)} events={[weekly]} onEventDelete={onEventDelete} onOccurrenceDelete={onOccurrenceDelete} />)
    act(() => screen.getByText('Standup').click())
    act(() => within(popover()!).getByRole('button', { name: 'Delete' }).click())
    expect(onOccurrenceDelete).toHaveBeenCalledTimes(1)
    expect(onEventDelete).toHaveBeenCalledTimes(1)
  })

  test('the event menu\'s Edit goes straight to the editor', () => {
    render(<Scheduler view="day" date={today} events={[standup]} />)
    fireEvent.contextMenu(screen.getByText('Standup'))
    act(() => screen.getByRole('button', { name: /Edit/ }).click())
    expect(popover()).toBeNull()
    expect((screen.getByPlaceholderText('Add title') as HTMLInputElement).value).toBe('Standup')
  })

  test('with renderEventForm (1.x) a click opens the custom form on the event, with no popover', () => {
    const renderEventForm = vi.fn(() => null)
    openStandup({ renderEventForm })
    expect(popover()).toBeNull()
    expect(renderEventForm).toHaveBeenLastCalledWith(expect.objectContaining({ isOpen: true, event: expect.objectContaining({ id: 'su' }) }))
  })

  test('readOnly (1.x): onEventClick is called and nothing opens', () => {
    const onEventClick = vi.fn()
    openStandup({ readOnly: true, onEventClick })
    expect(onEventClick).toHaveBeenCalled()
    expect(popover()).toBeNull()
  })
})
