// Spec §8.9: on a phone every dialog is a bottom sheet over the calendar, full width, its actions
// always in view: the event card, the quick card and the editor (Focus included, instead of a panel).
import { act, cleanup, render, screen, within } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { Scheduler } from './index'
import type { CalendarEvent } from './types'

const day = new Date(2026, 9, 15)
const review: CalendarEvent = { id: 'r', title: 'Design review', start: new Date(2026, 9, 15, 10), end: new Date(2026, 9, 15, 11) }
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

describe('bottom sheets on a phone', () => {
  test('the event card and the editor it opens are docked at the bottom', () => {
    render(<Scheduler view="day" date={day} events={[review]} />)
    act(() => screen.getByRole('button', { name: /^Design review/ }).click())
    const card = screen.getByRole('dialog', { name: 'Design review' })
    expect(card.hasAttribute('data-ck-docked')).toBe(true)
    expect(card.style.left).toBe('')
    act(() => within(card).getByRole('button', { name: 'Edit' }).click())
    expect(screen.getByRole('dialog').hasAttribute('data-ck-sheet')).toBe(true)
  })

  test('the quick card is docked too', () => {
    render(<Scheduler view="day" date={day} events={[]} />)
    act(() => screen.getByRole('button', { name: 'Create an event on Thursday 15 October at 9:00 AM' }).click())
    expect(screen.getByRole('dialog').hasAttribute('data-ck-docked')).toBe(true)
  })

  test('Focus: the editor is a sheet, not a side panel', () => {
    render(<Scheduler layout="focus" view="day" date={day} events={[review]} />)
    act(() => screen.getByRole('button', { name: /^Design review/ }).click())
    const editor = screen.getByRole('dialog')
    expect(editor.hasAttribute('data-ck-sheet')).toBe(true)
    expect(editor.hasAttribute('data-ck-panel')).toBe(false)
  })

  test('wide: the event card stays beside the event', () => {
    width = 1024
    render(<Scheduler view="day" date={day} events={[review]} />)
    act(() => screen.getByRole('button', { name: /^Design review/ }).click())
    expect(screen.getByRole('dialog', { name: 'Design review' }).hasAttribute('data-ck-docked')).toBe(false)
  })
  test('every button in a sheet is at least 44 px (spec §8.9 targets)', () => {
    render(<Scheduler view="day" date={day} events={[review]} />)
    act(() => screen.getByRole('button', { name: /^Design review/ }).click())
    const close = within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' })
    expect(getComputedStyle(close).minHeight).toBe('44px')
    expect(getComputedStyle(close).minWidth).toBe('44px')
  })
  test('small controls that are not finger targets on their own (colour swatches, chip remove buttons) keep their size', () => {
    render(<Scheduler view="day" date={day} events={[{ ...review, guests: ['a@b.co'] }]} />)
    act(() => screen.getByRole('button', { name: /^Design review/ }).click())
    act(() => within(screen.getByRole('dialog')).getByRole('button', { name: 'Edit' }).click())
    const editor = screen.getByRole('dialog')
    expect(getComputedStyle(within(editor).getByRole('button', { name: /a@b\.co/ })).minHeight).not.toBe('44px')
    act(() => within(editor).getByRole('button', { name: 'Event color' }).click())
    const swatch = editor.querySelector('button[aria-pressed]') as HTMLElement
    expect(getComputedStyle(swatch).minHeight).not.toBe('44px')
  })
})
