// Spec §8.8: a dialog takes the focus, keeps Tab inside it, and gives the focus back to what opened
// it when it closes (Escape included). The Focus panel sits beside a usable grid: no trap there.
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { Scheduler } from './index'
import type { CalendarEvent } from './types'

afterEach(cleanup)

const day = new Date(2026, 9, 15)
const review: CalendarEvent = { id: 'r', title: 'Design review', start: new Date(2026, 9, 15, 10), end: new Date(2026, 9, 15, 11) }
const focusables = (dialog: HTMLElement) => [...dialog.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled), select, textarea, [tabindex]:not([tabindex="-1"])')]
const press = (key: string, shiftKey = false) => fireEvent.keyDown(document.activeElement ?? document.body, { key, shiftKey })
const open = (button: HTMLElement) => act(() => { button.focus(); button.click() })

describe('dialog focus', () => {
  test('the event card takes the focus, Tab wraps inside it, Escape gives it back to the event', async () => {
    render(<Scheduler view="week" date={day} events={[review]} />)
    const event = screen.getByRole('button', { name: /^Design review/ })
    open(event)
    const dialog = screen.getByRole('dialog', { name: 'Design review' })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.contains(document.activeElement)).toBe(true)
    const items = focusables(dialog)
    act(() => items[items.length - 1].focus())
    press('Tab')
    expect(document.activeElement).toBe(items[0])
    press('Tab', true)
    expect(document.activeElement).toBe(items[items.length - 1])
    press('Escape')
    expect(screen.queryByRole('dialog')).toBeNull()
    await vi.waitFor(() => expect(document.activeElement).toBe(event))
  })

  test('the quick card opened from a slot gives the focus back to that slot', async () => {
    render(<Scheduler view="week" date={day} events={[]} />)
    const slot = screen.getByRole('button', { name: 'Create an event on Thursday 15 October at 9:00 AM' })
    open(slot)
    const dialog = screen.getByRole('dialog')
    expect(dialog.contains(document.activeElement)).toBe(true)
    press('Escape')
    expect(screen.queryByRole('dialog')).toBeNull()
    await vi.waitFor(() => expect(document.activeElement).toBe(slot))
  })

  test('Edit in the event card: the editor closes back onto the event, not the card that is gone', async () => {
    render(<Scheduler view="week" date={day} events={[review]} />)
    const event = screen.getByRole('button', { name: /^Design review/ })
    open(event)
    open(within(screen.getByRole('dialog')).getByRole('button', { name: 'Edit' }))
    const editor = screen.getByRole('dialog')
    expect(editor.contains(document.activeElement)).toBe(true)
    press('Escape')
    expect(screen.queryByRole('dialog')).toBeNull()
    await vi.waitFor(() => expect(document.activeElement).toBe(event))
  })

  test('the Focus panel keeps Tab free (the grid beside it stays reachable) and still gives the focus back', async () => {
    render(<Scheduler layout="focus" view="week" date={day} events={[review]} />)
    const event = screen.getByRole('button', { name: /^Design review/ })
    open(event)
    const panel = screen.getByRole('dialog')
    expect(panel.contains(document.activeElement)).toBe(true)
    const items = focusables(panel)
    act(() => items[items.length - 1].focus())
    expect(press('Tab')).toBe(true)
    press('Escape')
    expect(screen.queryByRole('dialog')).toBeNull()
    await vi.waitFor(() => expect(document.activeElement).toBe(event))
  })
  test('opened with Enter, the event card sits beside the event (not where the pointer last pressed)', () => {
    render(<Scheduler view="week" date={day} events={[review]} />)
    const event = screen.getByRole('button', { name: /^Design review/ })
    vi.spyOn(event, 'getBoundingClientRect').mockReturnValue({ left: 100, right: 200, top: 300, bottom: 340, width: 100, height: 40, x: 100, y: 300, toJSON: () => ({}) })
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Previous' }), { clientX: 900, clientY: 20 })
    act(() => event.focus())
    fireEvent.keyDown(event, { key: 'Enter' })
    act(() => event.click())
    expect(screen.getByRole('dialog').style.top).toBe('300px')
  })
})
