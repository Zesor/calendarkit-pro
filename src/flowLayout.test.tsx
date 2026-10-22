// Spec §8.1: `layout="flow"` — a strip of the week's days (with how busy each is), the day as a
// feed of cards in order, free slots to book, the current time, and a floating Create.
import { act, cleanup, render, screen, within } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { Scheduler } from './index'
import type { CalendarEvent } from './types'

const now = new Date(2026, 9, 15, 11, 52)
beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now }))
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m)
const events: CalendarEvent[] = [
  { id: 'a', title: 'Standup', start: at(15, 9), end: at(15, 9, 30), location: 'Room 2' },
  { id: 'b', title: 'Review', start: at(15, 14), end: at(15, 15) },
  { id: 'c', title: 'Offsite', start: at(15, 0), end: at(16, 0), allDay: true },
  { id: 'd', title: 'Lunch', start: at(16, 12), end: at(16, 13) },
]
const strip = () => screen.getByRole('group', { name: 'Days of the week' })
// The day's feed, named by its day (the week starts on Monday here).
const feed = () => screen.getByRole('list', { name: /day \d+ October/ })

describe('Flow layout', () => {
  test('the strip: the seven days of the week, today pressed, each with how many events it has', () => {
    render(<Scheduler layout="flow" defaultEvents={events} />)
    const days = within(strip()).getAllByRole('button')
    expect(days).toHaveLength(7)
    const today = within(strip()).getByRole('button', { pressed: true })
    expect(today.getAttribute('aria-label')).toBe('Thursday 15 October, 3 events')
  })

  test('the feed: all-day first, then events in order with their times, free slots and the current time', () => {
    render(<Scheduler layout="flow" defaultEvents={events} />)
    const items = within(feed()).getAllByRole('listitem').map((li) => li.textContent)
    expect(items[0]).toContain('Offsite')
    expect(items.findIndex((t) => t!.includes('Standup'))).toBeLessThan(items.findIndex((t) => t!.includes('Review')))
    expect(items.find((t) => t!.includes('Standup'))).toContain('9:00 AM – 9:30 AM · 30 min · Room 2')
    expect(items.some((t) => t!.includes('11:52 AM'))).toBe(true)
    expect(within(feed()).getAllByRole('button', { name: /Book/ }).length).toBeGreaterThan(0)
  })

  test('a day of the strip shows its feed', () => {
    render(<Scheduler layout="flow" defaultEvents={events} />)
    act(() => within(strip()).getAllByRole('button')[4].click())
    expect(within(feed()).getByText('Lunch')).toBeTruthy()
    expect(within(feed()).queryByText('Standup')).toBeNull()
  })

  test('Book opens the quick card for one hour at the start of that free time; Create too', () => {
    render(<Scheduler layout="flow" defaultEvents={events} />)
    // The second free slot runs from 9:30 (after Standup) to the current time, 11:52 (the first is 8:00 – 9:00).
    act(() => within(feed()).getAllByRole('button', { name: /Book/ })[1].click())
    expect(document.querySelector('[data-ck-layer] [role="dialog"]')!.textContent).toContain('9:30 AM – 10:30 AM')
    cleanup()
    render(<Scheduler layout="flow" defaultEvents={events} />)
    act(() => screen.getByRole('button', { name: 'Create' }).click())
    expect(document.querySelector('[data-ck-layer] [role="dialog"]')).toBeTruthy()
  })

  test('an empty day says so', () => {
    render(<Scheduler layout="flow" defaultEvents={[]} />)
    act(() => within(strip()).getAllByRole('button')[0].click())
    expect(within(feed()).getByText('Nothing planned this day')).toBeTruthy()
  })
})
