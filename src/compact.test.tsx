// Spec §8.9: under 768 px of calendar width (not of window: a calendar in a narrow column counts
// too), the phone layout: the day view by default, a header on two rows with 44 px targets, the
// menu and Today always there, one floating Create.
import { cleanup, render, screen } from '@testing-library/react'
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

describe('phone layout', () => {
  test('a narrow calendar is compact and opens on the day view; a controlled view is left alone', () => {
    const { container, unmount } = render(<Scheduler date={day} events={[]} />)
    expect(container.querySelector('.ck-root')!.hasAttribute('data-ck-compact')).toBe(true)
    expect(screen.getByRole('button', { name: 'Day', pressed: true })).toBeTruthy()
    unmount()
    render(<Scheduler view="week" date={day} events={[]} />)
    expect(screen.getByRole('button', { name: 'Week', pressed: true })).toBeTruthy()
  })

  test('a wide calendar is not compact and keeps the week view', () => {
    width = 1024
    const { container } = render(<Scheduler date={day} events={[]} />)
    expect(container.querySelector('.ck-root')!.hasAttribute('data-ck-compact')).toBe(false)
    expect(screen.getByRole('button', { name: 'Week', pressed: true })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Create Event' })).toBeNull()
  })

  test('compact header: menu and Today shown, 44 px targets', () => {
    render(<Scheduler view="day" date={day} events={[]} />)
    for (const name of ['Toggle sidebar', 'Today', 'Previous', 'Next', 'Day']) {
      const button = screen.getByRole('button', { name })
      expect(button.className).not.toMatch(/(^| )ck:hidden( |$)/)
      expect(button.className).toContain('ck:min-h-11')
    }
  })

  test('one floating Create: in Classic, none in Focus (its bar has one), none read-only', () => {
    const { rerender } = render(<Scheduler view="day" date={day} events={[]} />)
    expect(screen.getAllByRole('button', { name: 'Create Event' })).toHaveLength(1)
    rerender(<Scheduler layout="focus" view="day" date={day} events={[]} />)
    expect(screen.queryByRole('button', { name: 'Create Event' })).toBeNull()
    rerender(<Scheduler view="day" date={day} events={[]} readOnly />)
    expect(screen.queryByRole('button', { name: 'Create Event' })).toBeNull()
  })
})
