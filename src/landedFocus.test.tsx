// Spec §8.6: the event just created (or duplicated, moved) takes the focus, so a keyboard user
// lands on what they made instead of back on the slot.
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { Scheduler } from './index'
import type { CalendarEvent } from './types'

afterEach(cleanup)

const day = new Date(2026, 9, 15)
const review: CalendarEvent = { id: 'r', title: 'Design review', start: new Date(2026, 9, 15, 10), end: new Date(2026, 9, 15, 11) }
const open = (button: HTMLElement) => act(() => { button.focus(); button.click() })

describe('focus on the landed event', () => {
  test('a quick-created event takes the focus, not the slot it came from', async () => {
    render(<Scheduler view="day" date={day} />)
    open(screen.getByRole('button', { name: 'Create an event on Thursday 15 October at 9:00 AM' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getAllByRole('textbox')[0], { target: { value: 'Lunch' } })
    const slot = document.activeElement
    act(() => within(dialog).getByRole('button', { name: 'Save' }).click())
    // Not during the press that saved (Enter would go on and click whatever took the focus)…
    expect(document.activeElement).toBe(document.body)
    // …but a frame later, on the new event rather than back on the slot.
    await vi.waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: /^Lunch, Thursday 15 October/ })))
    expect(document.activeElement).not.toBe(slot)
  })

  test('a duplicate takes the focus', async () => {
    render(<Scheduler view="week" date={day} defaultEvents={[review]} />)
    open(screen.getByRole('button', { name: /^Design review/ }))
    act(() => within(screen.getByRole('dialog')).getByRole('button', { name: 'Duplicate' }).click())
    const copies = screen.getAllByRole('button', { name: /^Design review/ })
    expect(copies).toHaveLength(2)
    await vi.waitFor(() => expect(copies).toContain(document.activeElement))
    expect((document.activeElement as HTMLElement).dataset.ckEventId).not.toBe('r')
  })
  test('with a 1.x host that gives the event its own id, that event still takes the focus', async () => {
    const Host = () => {
      const [events, setEvents] = React.useState<CalendarEvent[]>([review])
      return <Scheduler view="day" date={day} events={events} onEventCreate={(e) => setEvents((list) => [...list, { ...e, id: 'host-1' } as CalendarEvent])} />
    }
    render(<Host />)
    open(screen.getByRole('button', { name: 'Create an event on Thursday 15 October at 9:00 AM' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getAllByRole('textbox')[0], { target: { value: 'Lunch' } })
    act(() => within(dialog).getByRole('button', { name: 'Save' }).click())
    await vi.waitFor(() => expect((document.activeElement as HTMLElement).dataset.ckEventId).toBe('host-1'))
  })
})
