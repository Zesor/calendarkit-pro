// Deferred accessibility minors (A3.4–A3.7 reviews): the place combobox's list and status, icon
// names in the event card, "1 event", the continuation chevrons of all-day bars.
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { resolveTranslations } from './core/format'
import { Scheduler } from './index'
import { EventModal } from './components/EventModal'
import type { CalendarEvent, Place, PlaceSearch } from './types'

afterEach(cleanup)

const day = new Date(2026, 9, 15)
const flore: Place = { name: 'Café de Flore', address: 'Paris', lat: 48.854, lon: 2.3326 }

describe('accessibility minors', () => {
  test('place combobox: its list exists while closed, one live region speaks, and the ARIA keys work without closing the form', async () => {
    let answer: (places: Place[]) => void = () => {}
    const search = vi.fn<PlaceSearch>(() => new Promise((resolve) => { answer = resolve }))
    const onClose = vi.fn()
    render(<EventModal isOpen onClose={onClose} onSave={() => {}} initialDate={day} translations={resolveTranslations('en')} placeSearch={search} />)
    const input = screen.getByLabelText('Location')
    expect(document.getElementById(input.getAttribute('aria-controls')!)).not.toBeNull()
    fireEvent.change(input, { target: { value: 'Flore' } })
    const status = screen.getByRole('status')
    expect(status.textContent).toBe('Searching…')
    await vi.waitFor(() => expect(search).toHaveBeenCalled())
    await act(async () => answer([flore]))
    expect(screen.getByRole('status')).toBe(status)
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(input.getAttribute('aria-activedescendant')).toBe(within(screen.getByRole('listbox')).getByRole('option').id)
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(input.getAttribute('aria-expanded')).toBe('false')
    expect(onClose).not.toHaveBeenCalled()
  })

  test('event card: icons are decoration, the row names are text; a Flow day says "1 event"', () => {
    const review: CalendarEvent = { id: 'r', title: 'Review', start: new Date(2026, 9, 15, 10), end: new Date(2026, 9, 15, 11), calendarId: 'w', guests: ['a@b.co'] }
    const { rerender } = render(<Scheduler view="week" date={day} events={[review]} calendars={[{ id: 'w', label: 'Work' }]} />)
    act(() => screen.getByRole('button', { name: /^Review/ }).click())
    const dialog = screen.getByRole('dialog')
    expect(dialog.querySelectorAll('svg[aria-label]')).toHaveLength(0)
    expect(within(dialog).getByText('Calendar')).toBeTruthy()
    rerender(<Scheduler layout="flow" date={day} events={[review]} />)
    expect(screen.getByRole('button', { name: 'Thursday 15 October, 1 event' })).toBeTruthy()
  })

  test('all-day bars: the continuation chevrons are hidden from the name (the label gives the dates)', () => {
    const trip: CalendarEvent = { id: 't', title: 'Trip', start: new Date(2026, 9, 8), end: new Date(2026, 9, 21), allDay: true }
    render(<Scheduler view="week" date={day} events={[trip]} />)
    const bar = screen.getByRole('button', { name: /^Trip/ })
    expect(bar.querySelectorAll('[aria-label]')).toHaveLength(0)
  })
})
