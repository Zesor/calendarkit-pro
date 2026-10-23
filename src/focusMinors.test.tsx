// Focus minors deferred from C and mobile: after a delete the focus lands where the event was (its
// slot), a host's own form gives the focus back when it closes, and Create from the phone drawer
// comes back to the menu.
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { Scheduler } from './index'
import type { CalendarEvent } from './types'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const day = new Date(2026, 9, 14)
const review: CalendarEvent = { id: 'rv', title: 'Design review', start: new Date(2026, 9, 14, 10, 30), end: new Date(2026, 9, 14, 11, 30) }
const open = (button: HTMLElement) => act(() => { button.focus(); button.click() })

describe('focus minors', () => {
  test('deleting from the event card puts the focus on the hour the event was in', async () => {
    render(<Scheduler view="day" date={day} defaultEvents={[review]} />)
    open(screen.getByRole('button', { name: /^Design review/ }))
    act(() => within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }).click())
    await vi.waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Create an event on Wednesday 14 October at 10:00 AM' })))
  })

  test("a host's renderEventForm gives the focus back to the slot when it closes", async () => {
    render(
      <Scheduler
        view="day"
        date={day}
        events={[]}
        renderEventForm={({ isOpen, onClose }) => (isOpen ? <div role="dialog" aria-label="My form"><input autoFocus aria-label="Title" /><button type="button" onClick={onClose}>Cancel</button></div> : null)}
      />,
    )
    const slot = screen.getByRole('button', { name: 'Create an event on Wednesday 14 October at 9:00 AM' })
    open(slot)
    expect(document.activeElement).toBe(screen.getByLabelText('Title'))
    act(() => screen.getByRole('button', { name: 'Cancel' }).click())
    await vi.waitFor(() => expect(document.activeElement).toBe(slot))
  })

  test('Create from the phone drawer: closing the quick card brings the focus back to the menu', async () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('ck-root') ? 375 : 0
    })
    render(<Scheduler view="day" date={day} events={[]} />)
    const menu = screen.getByRole('button', { name: 'Toggle sidebar' })
    open(menu)
    open(within(screen.getByRole('dialog')).getByRole('button', { name: 'Create' }))
    expect(screen.getByRole('dialog', { name: 'New Event' })).toBeTruthy()
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    await vi.waitFor(() => expect(document.activeElement).toBe(menu))
  })
})
