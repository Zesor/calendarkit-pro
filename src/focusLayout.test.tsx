// Spec §8.1: `layout="focus"` — the grid takes the whole calendar, under a floating toolbar
// (period, navigation, views, Create); Classic stays the default.
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { Scheduler } from './index'
import type { CalendarEvent, ToolbarProps } from './types'

afterEach(cleanup)

const day = new Date(2026, 9, 15)
const toolbar = () => screen.getByRole('toolbar', { name: 'Calendar navigation' })

describe('Focus layout', () => {
  test('no side panel; a floating toolbar with the period, Today, previous / next, the views and Create', () => {
    const { container } = render(<Scheduler layout="focus" view="week" date={day} events={[]} calendars={[{ id: 'w', label: 'Work' }]} />)
    expect(screen.queryByText('Calendars')).toBeNull()
    expect(within(toolbar()).getByText('October 2026')).toBeTruthy()
    for (const name of ['Today', 'Previous', 'Next', 'Month', 'Week', 'Day', 'Create']) expect(within(toolbar()).getByRole('button', { name })).toBeTruthy()
    expect(within(toolbar()).getByRole('button', { name: 'Week' }).getAttribute('aria-pressed')).toBe('true')
    expect(container.querySelector('.ck-root')!.getAttribute('data-ck-layout')).toBe('focus')
  })

  test('the toolbar drives the calendar: views, navigation, and Create opens the quick card', () => {
    render(<Scheduler layout="focus" events={[]} />)
    act(() => within(toolbar()).getByRole('button', { name: 'Month' }).click())
    expect(within(toolbar()).getByRole('button', { name: 'Month' }).getAttribute('aria-pressed')).toBe('true')
    const before = within(toolbar()).getByRole('heading').textContent
    act(() => within(toolbar()).getByRole('button', { name: 'Next' }).click())
    expect(within(toolbar()).getByRole('heading').textContent).not.toBe(before)
    act(() => within(toolbar()).getByRole('button', { name: 'Create' }).click())
    expect(document.querySelector('[data-ck-layer] [role="dialog"]')).toBeTruthy()
  })

  test('read-only: no Create', () => {
    render(<Scheduler layout="focus" readOnly events={[]} />)
    expect(within(toolbar()).queryByRole('button', { name: 'Create' })).toBeNull()
  })

  test('a custom Toolbar still replaces it', () => {
    const Toolbar = ({ view }: ToolbarProps) => <div>{`mine ${view}`}</div>
    render(<Scheduler layout="focus" view="week" events={[]} components={{ Toolbar }} />)
    expect(screen.getByText('mine week')).toBeTruthy()
    expect(screen.queryByRole('toolbar', { name: 'Calendar navigation' })).toBeNull()
  })

  test('Classic stays the default: the header and the side panel', () => {
    const { container } = render(<Scheduler view="week" date={day} events={[]} />)
    expect(screen.queryByRole('toolbar', { name: 'Calendar navigation' })).toBeNull()
    expect(screen.getAllByText('Create').length).toBeGreaterThan(0)
    expect(container.querySelector('.ck-root')!.getAttribute('data-ck-layout')).toBe('classic')
  })
})

describe('Focus layout: the editor as a side panel', () => {
  const standup: CalendarEvent = { id: 'su', title: 'Standup', start: new Date(2026, 9, 15, 9, 30), end: new Date(2026, 9, 15, 10) }
  const panel = () => document.querySelector<HTMLElement>('[data-ck-panel]')

  test('a click on an event opens it in the panel, beside the grid (no event card, no overlay)', () => {
    const { container } = render(<Scheduler layout="focus" view="day" date={day} events={[standup]} />)
    act(() => screen.getByText('Standup').click())
    expect(screen.queryByRole('button', { name: 'Duplicate' })).toBeNull()
    expect(panel()).toBeTruthy()
    expect((within(panel()!).getByPlaceholderText('Add title') as HTMLInputElement).value).toBe('Standup')
    // Docked in the calendar's row, next to the grid: not a floating card.
    expect(panel()!.style.left).toBe('')
    expect(panel()!.parentElement!.contains(container.querySelector('[data-ck-event-id="su"]'))).toBe(true)
    expect(container.querySelector('[data-ck-backdrop]')).toBeNull()
  })

  test('saving closes the panel; "More options" from the quick card opens it too', () => {
    const onEventUpdate = vi.fn()
    const { container } = render(<Scheduler layout="focus" view="day" date={day} events={[standup]} onEventUpdate={onEventUpdate} />)
    act(() => screen.getByText('Standup').click())
    fireEvent.change(within(panel()!).getByPlaceholderText('Add title'), { target: { value: 'Standup (moved)' } })
    fireEvent.submit(within(panel()!).getByPlaceholderText('Add title').closest('form')!)
    expect(onEventUpdate).toHaveBeenCalledWith(expect.objectContaining({ title: 'Standup (moved)' }))
    expect(panel()).toBeNull()
    act(() => container.querySelectorAll<HTMLElement>('.ck\\:z-0.ck\\:cursor-pointer')[56].click())
    act(() => screen.getByRole('button', { name: 'More options' }).click())
    expect(panel()).toBeTruthy()
  })

  test('Escape closes an untouched panel and asks once something was typed', () => {
    render(<Scheduler layout="focus" view="day" date={day} events={[standup]} />)
    act(() => screen.getByText('Standup').click())
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(panel()).toBeNull()
    act(() => screen.getByText('Standup').click())
    fireEvent.change(within(panel()!).getByPlaceholderText('Add title'), { target: { value: 'x' } })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByRole('alertdialog', { name: 'Discard changes?' })).toBeTruthy()
  })

  test('with renderEventForm (1.x) a click still opens the host\'s form', () => {
    const renderEventForm = vi.fn(() => null)
    render(<Scheduler layout="focus" view="day" date={day} events={[standup]} renderEventForm={renderEventForm} />)
    act(() => screen.getByText('Standup').click())
    expect(panel()).toBeNull()
    expect(renderEventForm).toHaveBeenLastCalledWith(expect.objectContaining({ isOpen: true, event: expect.objectContaining({ id: 'su' }) }))
  })
})
