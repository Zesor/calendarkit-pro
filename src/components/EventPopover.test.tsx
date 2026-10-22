// Spec §8.1 (Classic): a click on an event opens a popover with its real date, calendar, guests
// and the actions Edit / Duplicate / Delete; the editor opens only from Edit.
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { addDays, format, startOfDay } from 'date-fns'
import React from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { Scheduler } from '../index'
import type { CalendarEvent, CalendarProps } from '../types'

afterEach(cleanup)

const today = startOfDay(new Date())
const standup: CalendarEvent = {
  id: 'su', title: 'Standup', calendarId: 'w', guests: ['lea@example.com', 'bob@example.com'], description: 'Daily sync',
  start: new Date(today.getTime() + 9.5 * 3600e3), end: new Date(today.getTime() + 10 * 3600e3),
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
    expect(text).toContain(`${format(today, 'EEE d MMM')}, 9:30 AM – 10:00 AM`)
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
    const night: CalendarEvent = { id: 'n', title: 'Night shift', start: new Date(today.getTime() + 22 * 3600e3), end: new Date(today.getTime() + 26 * 3600e3) }
    render(<Scheduler view="day" date={today} events={[night]} />)
    act(() => screen.getAllByText('Night shift')[0].click())
    expect(screen.getByRole('dialog', { name: 'Night shift' }).textContent).toContain(`${format(today, 'EEE d MMM')}, 10:00 PM – ${format(addDays(today, 1), 'EEE d MMM')}, 2:00 AM`)
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

  test('it opens next to the pointer and stays inside the window', () => {
    render(<Scheduler view="day" date={today} events={[standup]} />)
    fireEvent.pointerDown(screen.getByText('Standup'), { clientX: window.innerWidth - 4, clientY: 40 })
    act(() => screen.getByText('Standup').click())
    const style = popover()!.style
    expect(parseFloat(style.left)).toBeLessThanOrEqual(window.innerWidth - 320 - 8)
    expect(parseFloat(style.top)).toBe(48)
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
