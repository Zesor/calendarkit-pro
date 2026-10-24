// Spec §7: `classNames` adds the host's classes to each part of the calendar, next to the built-in ones.
import { act, cleanup, render, screen } from '@testing-library/react'
import { addDays, startOfDay } from 'date-fns'
import React from 'react'
import { afterEach, describe, expect, test } from 'vitest'
import { Scheduler } from './index'
import type { CalendarClassNames, CalendarEvent } from './types'
import { todayAt } from './test/time'

afterEach(cleanup)

const today = startOfDay(new Date())
const standup: CalendarEvent = { id: 'su', title: 'Standup', start: todayAt(9.5), end: todayAt(10) }
const offsite: CalendarEvent = { id: 'off', title: 'Offsite', start: today, end: addDays(today, 1), allDay: true }
const classNames: CalendarClassNames = { root: 'x-root', toolbar: 'x-toolbar', sidebar: 'x-sidebar', event: 'x-event', slot: 'x-slot', allDayBar: 'x-bar', dialog: 'x-dialog' }

describe('classNames', () => {
  test('each part of the week gets its class, and the built-in classes stay', () => {
    const { container } = render(<Scheduler view="week" date={today} events={[standup, offsite]} classNames={classNames} />)
    expect(container.querySelector('.ck-root')!.classList).toContain('x-root')
    expect(container.querySelector('.x-toolbar')!.textContent).toContain('Today')
    expect(container.querySelector('.x-sidebar')!.textContent).toContain('Create')
    const block = screen.getByText('Standup').closest('.ck-event')!
    expect(block.classList).toContain('x-event')
    expect(block.classList).toContain('ck:rounded-md')
    const bar = screen.getByText('Offsite').closest('.ck-event')!.classList
    expect(bar).toContain('x-bar')
    expect(bar).toContain('x-event')
    expect(container.querySelectorAll('.x-slot').length).toBeGreaterThan(7 * 24)
  })

  test('the quick card and the editor get the dialog class', () => {
    const { container } = render(<Scheduler view="day" date={today} events={[standup]} classNames={classNames} />)
    act(() => container.querySelectorAll<HTMLElement>('.x-slot.ck\\:cursor-pointer')[40].click())
    expect(screen.getByRole('dialog', { name: 'New Event' }).classList).toContain('x-dialog')
    act(() => screen.getByRole('button', { name: 'More options' }).click())
    expect(screen.getByPlaceholderText('Add title').closest('.x-dialog')).toBeTruthy()
  })

  test('month chips and agenda items get the event class', () => {
    const { rerender } = render(<Scheduler view="month" date={today} events={[standup]} classNames={classNames} />)
    expect(screen.getByText('Standup').closest('.x-event')).toBeTruthy()
    rerender(<Scheduler view="agenda" date={today} events={[standup]} classNames={classNames} />)
    expect(screen.getByText('Standup').closest('.x-event')).toBeTruthy()
  })
})
