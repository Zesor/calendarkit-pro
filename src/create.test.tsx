// "Create" works like a click in the grid (spec §8.5): the quick card at the next free hour, beside
// its ghost, never a full-screen form first.
import { act, cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { Scheduler } from './index'
import type { CalendarEvent } from './types'

const now = new Date(2026, 9, 15, 10, 7)
beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now }))
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const review: CalendarEvent = { id: 'r', title: 'Review', start: new Date(2026, 9, 15, 10, 30), end: new Date(2026, 9, 15, 11, 30) }
// The side panel sits in a desktop-only column: its button is found by its text (jsdom applies no media query).
const create = () => act(() => screen.getAllByText('Create')[0].click())
const quickCard = () => document.querySelector('[data-ck-layer] [role="dialog"]')

describe('Create', () => {
  test('opens the quick card at the next free hour, with its ghost in the grid', () => {
    const { container } = render(<Scheduler view="week" defaultEvents={[review]} />)
    create()
    expect(quickCard()!.textContent).toContain('11:30 AM – 12:30 PM')
    expect(container.querySelector('[data-ck-ghost]')).toBeTruthy()
    expect(screen.queryByPlaceholderText('Add title')).toBeNull()
  })

  test('in the day view of another day, goes to today first', () => {
    const { container } = render(<Scheduler view="day" defaultEvents={[]} />)
    act(() => screen.getByRole('button', { name: /next/i }).click())
    create()
    expect(screen.getAllByText(/October 15/).length).toBeGreaterThan(0)
    expect(container.querySelector('[data-ck-ghost]')).toBeTruthy()
  })

  test('with renderEventForm (1.x), opens the host\'s form at that time', () => {
    const renderEventForm = vi.fn(() => null)
    render(<Scheduler view="week" events={[review]} renderEventForm={renderEventForm} />)
    create()
    expect(quickCard()).toBeNull()
    expect(renderEventForm).toHaveBeenLastCalledWith(expect.objectContaining({ isOpen: true, initialDate: new Date(2026, 9, 15, 11, 30) }))
  })
})
