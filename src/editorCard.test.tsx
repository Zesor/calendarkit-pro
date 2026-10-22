// The full form is a card beside what it edits (no full-screen overlay, no blurred calendar):
// beside the new event's ghost, or beside the event being edited.
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { startOfDay } from 'date-fns'
import React from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { Scheduler } from './index'
import type { CalendarEvent } from './types'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const today = startOfDay(new Date())
const standup: CalendarEvent = { id: 'su', title: 'Standup', start: new Date(today.getTime() + 9.5 * 3600e3), end: new Date(today.getTime() + 10 * 3600e3) }
const editor = () => screen.getByPlaceholderText('Add title').closest('[role="dialog"]') as HTMLElement
// jsdom measures nothing: the elements matching `selector` get `box`, the others nothing.
function boxes(selector: string, box: { left: number; top: number; right: number; bottom: number }) {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const b = this.matches(selector) ? box : { left: 0, top: 0, right: 0, bottom: 0 }
    return { ...b, x: b.left, y: b.top, width: b.right - b.left, height: b.bottom - b.top, toJSON: () => ({}) } as DOMRect
  })
}

describe('the full form as a card', () => {
  test('"More options" opens it beside the new event, and the calendar is neither dimmed nor blurred', () => {
    boxes('[data-ck-ghost]', { left: 300, top: 260, right: 400, bottom: 320 })
    const { container } = render(<Scheduler view="day" date={today} events={[standup]} />)
    act(() => container.querySelectorAll<HTMLElement>('.ck\\:z-0.ck\\:cursor-pointer')[44].click())
    act(() => screen.getByRole('button', { name: 'More options' }).click())
    expect(editor().style.left).toBe('412px')
    expect(editor().style.top).toBe('260px')
    // Nothing laid over the whole calendar dims or blurs it.
    expect([...container.querySelectorAll('[class*="inset-0"]')].some((el) => /bg-black|backdrop-blur/.test(el.className))).toBe(false)
  })

  test('Edit in the event card opens it beside the event', () => {
    boxes('[data-ck-event-id="su"]', { left: 100, top: 150, right: 200, bottom: 250 })
    render(<Scheduler view="day" date={today} events={[standup]} />)
    act(() => screen.getByText('Standup').click())
    act(() => within(screen.getByRole('dialog', { name: 'Standup' })).getByRole('button', { name: 'Edit' }).click())
    expect(editor().style.left).toBe('212px')
    expect(editor().style.top).toBe('150px')
  })

  test('a click outside closes an untouched form, and asks once something was typed', () => {
    const { container } = render(<Scheduler view="day" date={today} events={[standup]} />)
    act(() => screen.getAllByText('Create')[0].click())
    act(() => screen.getByRole('button', { name: 'More options' }).click())
    fireEvent.change(screen.getByPlaceholderText('Add title'), { target: { value: 'Call' } })
    act(() => (container.querySelector('[data-ck-backdrop]') as HTMLElement).click())
    expect(screen.getByRole('alertdialog', { name: 'Discard changes?' })).toBeTruthy()
  })
})

describe('the full form in the calendar\'s time zone', () => {
  // 14:00 in Tokyo, whatever the zone of the machine running the tests.
  const tokyo: CalendarEvent = { id: 't', title: 'Sync', start: new Date('2026-10-15T05:00:00Z'), end: new Date('2026-10-15T06:00:00Z') }

  test('editing shows the times the grid shows, and saving keeps the instant', () => {
    const onEventUpdate = vi.fn()
    render(<Scheduler view="day" date={new Date('2026-10-15T05:00:00Z')} timezone="Asia/Tokyo" events={[tokyo]} onEventUpdate={onEventUpdate} />)
    act(() => screen.getByText('Sync').click())
    act(() => within(screen.getByRole('dialog', { name: 'Sync' })).getByRole('button', { name: 'Edit' }).click())
    expect((screen.getByLabelText('Start') as HTMLInputElement).value).toBe('2026-10-15T14:00')
    fireEvent.submit(screen.getByPlaceholderText('Add title').closest('form')!)
    expect(onEventUpdate.mock.calls[0][0].start.toISOString()).toBe('2026-10-15T05:00:00.000Z')
  })

  test('"More options" saves the new event at the time it showed', () => {
    const onEventCreate = vi.fn()
    const { container } = render(<Scheduler view="day" date={new Date('2026-10-15T05:00:00Z')} timezone="Asia/Tokyo" events={[]} onEventCreate={onEventCreate} />)
    act(() => container.querySelectorAll<HTMLElement>('.ck\\:z-0.ck\\:cursor-pointer')[56].click())
    act(() => screen.getByRole('button', { name: 'More options' }).click())
    expect((screen.getByLabelText('Start') as HTMLInputElement).value).toBe('2026-10-15T14:00')
    fireEvent.change(screen.getByPlaceholderText('Add title'), { target: { value: 'Call' } })
    fireEvent.submit(screen.getByPlaceholderText('Add title').closest('form')!)
    expect(onEventCreate.mock.calls[0][0].start.toISOString()).toBe('2026-10-15T05:00:00.000Z')
  })
})
