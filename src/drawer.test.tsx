// Spec §8.9: on a phone the side panel is a drawer over the calendar (light scrim, no blur), opened
// by the menu button; it closes by itself once a day is picked. On a wide calendar it is a column.
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { Scheduler } from './index'

const day = new Date(2026, 9, 15)
let width = 375
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
    return this.classList.contains('ck-root') ? width : 0
  })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  width = 375
})

describe('side panel drawer', () => {
  test('compact: the menu opens a modal drawer; Escape closes it and the focus goes back to the menu', async () => {
    render(<Scheduler view="day" date={day} events={[]} />)
    expect(screen.queryByRole('dialog')).toBeNull()
    const menu = screen.getByRole('button', { name: 'Toggle sidebar' })
    act(() => { menu.focus(); menu.click() })
    const drawer = screen.getByRole('dialog', { name: 'Calendar navigation' })
    expect(drawer.getAttribute('aria-modal')).toBe('true')
    expect(within(drawer).getByRole('button', { name: 'Create' })).toBeTruthy()
    expect(drawer.contains(document.activeElement)).toBe(true)
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    await vi.waitFor(() => expect(document.activeElement).toBe(menu))
  })

  test('picking a day in the drawer goes to that day and closes it; the scrim closes it too', () => {
    const onDateChange = vi.fn()
    render(<Scheduler view="day" date={day} events={[]} onDateChange={onDateChange} />)
    act(() => screen.getByRole('button', { name: 'Toggle sidebar' }).click())
    act(() => within(screen.getByRole('dialog')).getByRole('button', { name: 'Tuesday 20 October 2026' }).click())
    expect(onDateChange.mock.calls.at(-1)![0].getDate()).toBe(20)
    expect(screen.queryByRole('dialog')).toBeNull()
    act(() => screen.getByRole('button', { name: 'Toggle sidebar' }).click())
    act(() => (document.querySelector('[data-ck-drawer-scrim]') as HTMLElement).click())
    expect(screen.queryByRole('dialog')).toBeNull()
    // A close button too: a screen reader on a phone cannot reach the scrim.
    act(() => screen.getByRole('button', { name: 'Toggle sidebar' }).click())
    act(() => within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }).click())
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  test('wide: the side panel is a column, shown whatever the window size', () => {
    width = 1024
    render(<Scheduler view="week" date={day} events={[]} />)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: 'Create' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Thursday 15 October 2026', pressed: true })).toBeTruthy()
  })
  test('a drawer left open when the calendar grows does not come back by itself when it narrows again', () => {
    const observers: ResizeObserverCallback[] = []
    const resize = (w: number) => observers.forEach((cb) => cb([{ contentRect: { width: w } } as ResizeObserverEntry], {} as ResizeObserver))
    vi.stubGlobal('ResizeObserver', class { constructor(cb: ResizeObserverCallback) { observers.push(cb) } observe() {} disconnect() {} })
    render(<Scheduler view="day" date={day} events={[]} />)
    act(() => screen.getByRole('button', { name: 'Toggle sidebar' }).click())
    expect(screen.getByRole('dialog')).toBeTruthy()
    act(() => resize(1024))
    act(() => resize(375))
    expect(screen.queryByRole('dialog')).toBeNull()
    vi.unstubAllGlobals()
  })
})
