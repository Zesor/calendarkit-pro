import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
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
})

describe('EventModal', () => {
  test('I1/I3: the form is fully translated (French)', () => {
    openCreate({ translations: fr })
    expect(screen.getByText('Nouvel événement')).toBeTruthy()
    expect(screen.getByText('Début')).toBeTruthy()
    expect(screen.getByText('Fin')).toBeTruthy()
    expect(screen.getByText('Rappels')).toBeTruthy()
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
})

describe('EventModal: no made-up defaults, and changes are never dropped without asking (spec §8.5)', () => {
  const save = () => fireEvent.submit(screen.getByLabelText('Add title').closest('form')!)

  test('a new event has no reminder and no colour: its calendar colours it', () => {
    const onSave = vi.fn()
    openCreate({ onSave, calendars: [{ id: 'w', label: 'Work', color: '#047857' }] })
    fireEvent.change(screen.getByLabelText('Add title'), { target: { value: 'Call' } })
    save()
    expect(onSave.mock.calls[0][0]).toMatchObject({ reminders: [], calendarId: 'w' })
    expect(onSave.mock.calls[0][0].color).toBeUndefined()
  })

  test('saving an event without reminders keeps it without reminders', () => {
    const onSave = vi.fn()
    const event: CalendarEvent = { id: 'a', title: 'Review', start, end: new Date(2026, 9, 15, 10) }
    render(<EventModal isOpen onClose={() => {}} onSave={onSave} event={event} translations={en} />)
    save()
    expect(onSave.mock.calls[0][0].reminders).toEqual([])
  })

  test('Cancel, Escape or a click outside close an untouched form, and ask once something was typed', () => {
    const onClose = vi.fn()
    openCreate({ onClose })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.change(screen.getByLabelText('Add title'), { target: { value: 'Call' } })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByRole('alertdialog', { name: 'Discard changes?' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  test('the fields chosen in the quick card open in the editor', () => {
    openCreate({ initialValues: { title: 'Lunch with Lea', end: new Date(2026, 9, 15, 10, 30) } })
    expect((screen.getByLabelText('Add title') as HTMLInputElement).value).toBe('Lunch with Lea')
    expect(screen.getByText('1 hr 30 min')).toBeTruthy()
  })
})
