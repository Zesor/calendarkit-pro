// Spec §8.8: time slots and all-day cells are native buttons with a name that says what they do.
// One tab stop per hour (the half hours stay clickable), so Tab walks a day in 24 steps, not 48.
import { act, cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, test } from 'vitest'
import { fr } from 'date-fns/locale'
import { Scheduler } from './index'

afterEach(cleanup)

const day = new Date(2026, 9, 15)

describe('slot buttons', () => {
  test('week view: each hour is a tab stop named for what it creates; half hours are buttons out of the tab order', () => {
    render(<Scheduler view="week" date={day} events={[]} />)
    const nine = screen.getByRole('button', { name: 'Create an event on Thursday 15 October at 9:00 AM' })
    expect(nine.tagName).toBe('BUTTON')
    expect(nine.tabIndex).toBe(0)
    expect(screen.getByRole('button', { name: 'Create an event on Thursday 15 October at 9:30 AM' }).tabIndex).toBe(-1)
    act(() => nine.click())
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  test('the all-day cells and the resource timeline are named buttons too', () => {
    const { rerender } = render(<Scheduler view="week" date={day} events={[]} />)
    expect(screen.getByRole('button', { name: 'Create an all-day event on Thursday 15 October' }).tagName).toBe('BUTTON')
    rerender(<Scheduler view="resource" date={day} events={[]} resources={[{ id: 'a', label: 'Room A' }]} />)
    expect(screen.getByRole('button', { name: 'Create an event on Thursday 15 October at 9:00 AM, Room A' }).tagName).toBe('BUTTON')
  })

  test('French names; read-only: no slot buttons at all', () => {
    const { rerender } = render(<Scheduler view="day" date={day} events={[]} language="fr" locale={fr} />)
    expect(screen.getByRole('button', { name: /^Créer un événement le jeudi 15 octobre à 9:00/ })).toBeTruthy()
    rerender(<Scheduler view="day" date={day} events={[]} readOnly />)
    expect(screen.queryByRole('button', { name: /^Create an/ })).toBeNull()
  })
})
