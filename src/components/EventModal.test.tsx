import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { fr as frLocale } from 'date-fns/locale'
import { resolveTranslations } from '../core/format'
import type { CalendarEvent } from '../types'
import { EventModal, reminderLabel } from './EventModal'

afterEach(cleanup)

const en = resolveTranslations('en')
const fr = resolveTranslations('fr')
const start = new Date(2026, 9, 15, 9, 0)

const openCreate = (props: Partial<React.ComponentProps<typeof EventModal>> = {}) =>
  render(<EventModal isOpen onClose={() => {}} onSave={() => {}} initialDate={start} translations={en} {...props} />)

describe('EventModal all-day', () => {
  const save = () => fireEvent.submit(screen.getByLabelText('Add title').closest('form')!)

  test('opened from the all-day row: preset to an all-day event with an exclusive end', () => {
    const onSave = vi.fn()
    render(<EventModal isOpen onClose={() => {}} onSave={onSave} initialDate={new Date(2026, 9, 14, 0, 0)} initialAllDay translations={en} />)
    expect(screen.getByRole('switch', { name: 'All Day' }).getAttribute('aria-checked')).toBe('true')
    expect((screen.getByLabelText('End') as HTMLInputElement).type).toBe('date')
    expect((screen.getByLabelText('End') as HTMLInputElement).value).toBe('2026-10-14')
    fireEvent.change(screen.getByLabelText('Add title'), { target: { value: 'Off' } })
    save()
    expect(onSave.mock.calls[0][0]).toMatchObject({ allDay: true, start: new Date(2026, 9, 14), end: new Date(2026, 9, 15) })
  })

  test('the end field shows the last day included; saving converts it to an exclusive end', () => {
    const onSave = vi.fn()
    render(<EventModal isOpen onClose={() => {}} onSave={onSave} initialDate={new Date(2026, 9, 14)} initialAllDay translations={en} />)
    fireEvent.change(screen.getByLabelText('End'), { target: { value: '2026-10-16' } })
    expect(screen.getByText('3 days')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Add title'), { target: { value: 'Conference' } })
    save()
    expect(onSave.mock.calls[0][0]).toMatchObject({ start: new Date(2026, 9, 14), end: new Date(2026, 9, 17) })
  })

  test('toggling all-day on and off', () => {
    const onSave = vi.fn()
    openCreate({ onSave }) // 15 Oct 09:00 → 10:00
    fireEvent.click(screen.getByRole('switch', { name: 'All Day' }))
    expect((screen.getByLabelText('Start') as HTMLInputElement).value).toBe('2026-10-15')
    fireEvent.click(screen.getByRole('switch', { name: 'All Day' }))
    expect((screen.getByLabelText('Start') as HTMLInputElement).value).toBe('2026-10-15T09:00')
  })

  test('the read view shows the day range and an "All Day" badge', async () => {
    const event: CalendarEvent = { id: 'c', title: 'Conference', start: new Date(2026, 9, 12), end: new Date(2026, 9, 15), allDay: true }
    render(<EventModal isOpen event={event} onClose={() => {}} onSave={() => {}} translations={en} />)
    expect(await screen.findByText('Mon 12 Oct – Wed 14 Oct')).toBeTruthy()
    expect(screen.getByText('All Day')).toBeTruthy()
  })
})

describe('EventModal', () => {
  test('I1/I3: the form is fully translated (French) and times follow the locale', () => {
    openCreate({ translations: fr, locale: frLocale })
    expect(screen.getByText('Nouvel événement')).toBeTruthy()
    expect(screen.getByText('Début')).toBeTruthy()
    expect(screen.getByText('Fin')).toBeTruthy()
    expect(screen.getByText('Rappels')).toBeTruthy()
    expect(screen.getByText('30 minutes avant')).toBeTruthy()
    expect(screen.getByText('1 h')).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Ne se répète pas' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Créer un événement' })).toBeTruthy()
    expect(screen.queryByText(/Reminders|Guests|Cancel|New Event/)).toBeNull()
  })

  test('reminderLabel covers minutes, hours, days and weeks', () => {
    expect([0, 5, 60, 120, 1440, 2880, 10080].map((m) => reminderLabel(m, en))).toEqual([
      'At time of event', '5 minutes before', '1 hour before', '2 hours before', '1 day before', '2 days before', '1 week before',
    ])
  })

  test('U2: guests are typed freely, invalid emails are rejected, and no fake guests are suggested', () => {
    const onSave = vi.fn()
    openCreate({ onSave })
    const input = screen.getByLabelText('Guests')
    fireEvent.change(input, { target: { value: 'not-an-email' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByRole('alert').textContent).toBe('Enter a valid email address')
    fireEvent.change(input, { target: { value: 'ada@lovelace.dev' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText('ada@lovelace.dev')).toBeTruthy()
    expect(document.body.textContent).not.toContain('@example.com')
    fireEvent.change(screen.getByLabelText('Add title'), { target: { value: 'Sync' } })
    fireEvent.submit(screen.getByLabelText('Add title').closest('form')!)
    expect(onSave.mock.calls[0][0].guests).toEqual(['ada@lovelace.dev'])
  })

  test('pasting a list adds every valid email and keeps the invalid one with an error', () => {
    openCreate()
    const input = screen.getByLabelText('Guests')
    fireEvent.change(input, { target: { value: 'ada@lovelace.dev, nope; grace@hopper.dev' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText('ada@lovelace.dev')).toBeTruthy()
    expect(screen.getByText('grace@hopper.dev')).toBeTruthy()
    expect((input as HTMLInputElement).value).toBe('nope')
    expect(screen.getByRole('alert')).toBeTruthy()
  })

  test('a valid email still in the input is added on save', () => {
    const onSave = vi.fn()
    openCreate({ onSave })
    fireEvent.change(screen.getByLabelText('Add title'), { target: { value: 'Sync' } })
    fireEvent.change(screen.getByLabelText('Guests'), { target: { value: 'grace@hopper.dev' } })
    fireEvent.submit(screen.getByLabelText('Add title').closest('form')!)
    expect(onSave.mock.calls[0][0].guests).toEqual(['grace@hopper.dev'])
  })

  test('re-rendering with a new (inline) translations object keeps what the user typed', () => {
    const { rerender } = openCreate()
    fireEvent.change(screen.getByLabelText('Add title'), { target: { value: 'Draft' } })
    rerender(<EventModal isOpen onClose={() => {}} onSave={() => {}} initialDate={start} translations={{ ...en }} />)
    expect((screen.getByLabelText('Add title') as HTMLInputElement).value).toBe('Draft')
  })

  test('the guest field does not use browser email validation, and duplicates ignore case', () => {
    openCreate()
    const input = screen.getByLabelText('Guests') as HTMLInputElement
    expect(input.type).toBe('text')
    fireEvent.change(input, { target: { value: 'Ada@Lovelace.dev, ada@lovelace.dev' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getAllByText(/ada@lovelace\.dev/i)).toHaveLength(1)
  })

  test('the calendar selector is hidden when no calendars are provided', () => {
    openCreate()
    expect(screen.queryByText('Calendar')).toBeNull()
  })

  describe('view mode', () => {
    const event: CalendarEvent = {
      id: 'e', title: 'Offsite', start, end: new Date(2026, 9, 15, 10),
      location: '10 Downing St, London',
      attachments: [
        { id: 'a', name: 'agenda.pdf', url: 'https://files.example/agenda.pdf', type: 'file' },
        { id: 'b', name: 'notes.txt', type: 'file' },
      ],
    }

    // The view mode appears after the edit form's exit animation: wait for it.
    test('U4: the location opens a maps search with an encoded query', async () => {
      render(<EventModal isOpen event={event} onClose={() => {}} onSave={() => {}} translations={en} />)
      const link = (await screen.findByText('Open in maps')).closest('a')!
      expect(link.getAttribute('href')).toBe('https://www.google.com/maps/search/?api=1&query=10%20Downing%20St%2C%20London')
      expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    })

    test('U6: only attachments with a URL are links (no generated placeholder download)', async () => {
      render(<EventModal isOpen event={event} onClose={() => {}} onSave={() => {}} translations={en} />)
      expect((await screen.findByText('agenda.pdf')).closest('a')?.getAttribute('href')).toBe('https://files.example/agenda.pdf')
      expect(screen.getByText('notes.txt').closest('a')).toBeNull()
    })

    test('an attachment with an unsafe URL scheme is not a link', async () => {
      const unsafe = { ...event, attachments: [{ id: 'x', name: 'evil.txt', url: 'javascript:alert(1)', type: 'file' as const }] }
      render(<EventModal isOpen event={unsafe} onClose={() => {}} onSave={() => {}} translations={en} />)
      expect((await screen.findByText('evil.txt')).closest('a')).toBeNull()
    })

    test('A1: icon-only buttons have accessible names', async () => {
      render(<EventModal isOpen event={event} onClose={() => {}} onSave={() => {}} translations={fr} />)
      expect(await screen.findByRole('button', { name: 'Modifier' })).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Supprimer' })).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Fermer' })).toBeTruthy()
    })
  })
})
