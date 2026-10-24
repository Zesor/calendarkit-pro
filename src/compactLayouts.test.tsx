// Spec §8.9: on a phone the Focus bar picks its view from a menu (the four pills do not fit), with
// 44 px targets; the Flow strip keeps the chosen day in view (deferred A3.7 minor).
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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

describe('Focus and Flow on a phone', () => {
  test('Focus: the view is a menu, the bar buttons are 44 px', () => {
    const onViewChange = vi.fn()
    render(<Scheduler layout="focus" view="day" date={day} events={[]} onViewChange={onViewChange} />)
    const menu = screen.getByRole('combobox', { name: 'View' }) as HTMLSelectElement
    expect(menu.value).toBe('day')
    expect(screen.queryByRole('button', { name: 'Week' })).toBeNull()
    fireEvent.change(menu, { target: { value: 'week' } })
    expect(onViewChange).toHaveBeenCalledWith('week')
    for (const name of ['Today', 'Previous', 'Next', 'Create']) expect(screen.getByRole('button', { name }).className).toContain('ck:min-h-11')
  })

  test('Focus, wide: the view pills stay', () => {
    width = 1024
    render(<Scheduler layout="focus" view="day" date={day} events={[]} />)
    expect(screen.queryByRole('combobox', { name: 'View' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Week' })).toBeTruthy()
  })

  test('Flow: the chosen day is scrolled into view in the strip', () => {
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    render(<Scheduler layout="flow" date={day} events={[]} />)
    const pressed = screen.getByRole('button', { pressed: true, name: /^Thursday 15 October/ })
    expect(scroll.mock.contexts).toContain(pressed)
  })
})
