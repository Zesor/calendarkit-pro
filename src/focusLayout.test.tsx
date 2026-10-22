// Spec §8.1: `layout="focus"` — the grid takes the whole calendar, under a floating toolbar
// (period, navigation, views, Create); Classic stays the default.
import { act, cleanup, render, screen, within } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, test } from 'vitest'
import { Scheduler } from './index'
import type { ToolbarProps } from './types'

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
