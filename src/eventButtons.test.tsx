// Spec §8.8: every event (block, bar, month chip, agenda item, Flow card) is a native button
// reachable with Tab, with its full name: title, date, times, calendar, place.
import { act, cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { Scheduler } from './index'
import type { CalendarEvent } from './types'
import { eventLabel } from './components/eventLabel'
import { resolveTranslations } from './core/format'

afterEach(cleanup)

const day = new Date(2026, 9, 15)
const calendars = [{ id: 'w', label: 'Work' }]
const review: CalendarEvent = { id: 'r', title: 'Design review', start: new Date(2026, 9, 15, 10), end: new Date(2026, 9, 15, 11, 45), calendarId: 'w', location: 'Room B' }
const offsite: CalendarEvent = { id: 'o', title: 'Offsite', start: new Date(2026, 9, 15), end: new Date(2026, 9, 17), allDay: true }
const REVIEW_NO_CALENDAR = 'Design review, Thursday 15 October, 10:00 AM to 11:45 AM, Room B'
const REVIEW = 'Design review, Thursday 15 October, 10:00 AM to 11:45 AM, Work calendar, Room B'

describe('event buttons', () => {
  test('eventLabel: title, date, times, calendar, place; all-day over several days', () => {
    const t = resolveTranslations('en')
    expect(eventLabel(review, { t, calendars })).toBe(REVIEW)
    expect(eventLabel(offsite, { t })).toBe('Offsite, Thursday 15 October to Friday 16 October, All Day')
    expect(eventLabel({ ...review, title: '', calendarId: undefined, location: undefined }, { t })).toBe('(No title), Thursday 15 October, 10:00 AM to 11:45 AM')
    expect(eventLabel(review, { t: resolveTranslations('fr'), calendars })).toBe('Design review, Thursday 15 October, de 10:00 AM à 11:45 AM, calendrier Work, Room B')
  })

  test('week view: blocks and all-day bars are named native buttons; the drag wrapper is not another tab stop', () => {
    const { container } = render(<Scheduler view="week" date={day} events={[review, offsite]} calendars={calendars} />)
    expect(screen.getByRole('button', { name: REVIEW }).tagName).toBe('BUTTON')
    expect(screen.getByRole('button', { name: /^Offsite, Thursday 15 October to Friday 16 October/ }).tagName).toBe('BUTTON')
    expect(container.querySelectorAll('[data-ck-drag][tabindex="0"]')).toHaveLength(0)
    act(() => screen.getByRole('button', { name: REVIEW }).click())
    expect(screen.getByRole('dialog', { name: 'Design review' })).toBeTruthy()
  })

  test('month chips, agenda items and Flow cards are named buttons too', () => {
    const { rerender } = render(<Scheduler view="month" date={day} events={[review]} calendars={calendars} />)
    expect(screen.getByRole('button', { name: REVIEW }).tagName).toBe('BUTTON')
    rerender(<Scheduler view="agenda" date={day} events={[review]} calendars={calendars} />)
    expect(screen.getByRole('button', { name: REVIEW }).tagName).toBe('BUTTON')
    rerender(<Scheduler layout="flow" date={day} events={[review]} calendars={calendars} />)
    expect(screen.getByRole('button', { name: REVIEW }).tagName).toBe('BUTTON')
  })

  test('month: each day number is a button that opens the day', () => {
    const onViewChange = vi.fn()
    const onDateChange = vi.fn()
    render(<Scheduler view="month" date={day} events={[]} onViewChange={onViewChange} onDateChange={onDateChange} />)
    act(() => screen.getAllByRole('button', { name: 'Thursday 15 October 2026' }).find((b) => !b.hasAttribute('aria-pressed'))!.click())
    expect(onViewChange).toHaveBeenCalledWith('day')
    expect(onDateChange.mock.calls[0][0].getTime()).toBe(day.getTime())
  })
  test('in a day column, Tab reaches its events before its 24 hour slots', () => {
    render(<Scheduler view="day" date={day} events={[review]} />)
    const event = screen.getByRole('button', { name: REVIEW_NO_CALENDAR })
    const midnight = screen.getByRole('button', { name: 'Create an event on Thursday 15 October at 12:00 AM' })
    expect(event.compareDocumentPosition(midnight) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
