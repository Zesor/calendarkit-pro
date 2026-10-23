// Spec §8.9: on a phone the month has no room for chips: each day is one button (40 px and up)
// showing its number and a dot per event, named with the count; it opens the day.
import { act, cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { Scheduler } from './index'
import type { CalendarEvent } from './types'

const day = new Date(2026, 9, 15)
const review: CalendarEvent = { id: 'r', title: 'Design review', start: new Date(2026, 9, 15, 10), end: new Date(2026, 9, 15, 11) }
const offsite: CalendarEvent = { id: 'o', title: 'Offsite', start: new Date(2026, 9, 15), end: new Date(2026, 9, 17), allDay: true }
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

describe('month on a phone', () => {
  test('each day is a button with its events counted; it opens the day', () => {
    const onViewChange = vi.fn()
    const onDateChange = vi.fn()
    render(<Scheduler view="month" date={day} events={[review, offsite]} onViewChange={onViewChange} onDateChange={onDateChange} />)
    expect(screen.queryByRole('button', { name: /^Design review/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Offsite/ })).toBeNull()
    const thursday = screen.getByRole('button', { name: 'Thursday 15 October 2026, 2 events' })
    expect(thursday.querySelectorAll('[data-ck-dot]')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Friday 16 October 2026, 1 event' })).toBeTruthy()
    act(() => thursday.click())
    expect(onViewChange).toHaveBeenCalledWith('day')
    expect(onDateChange.mock.calls.at(-1)![0].getDate()).toBe(15)
  })

  test('wide: the month keeps its chips and bars', () => {
    width = 1024
    render(<Scheduler view="month" date={day} events={[review, offsite]} />)
    expect(screen.getByRole('button', { name: /^Design review/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Offsite/ })).toBeTruthy()
  })
})
