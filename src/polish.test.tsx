// Polish deferred from C and mobile: no English dnd-kit instructions left for screen readers (and drag
// announcements in the calendar's language), named colour swatches, timezone choices reachable by
// keyboard, room under the phone's floating Create, `compact` for a host's own toolbar.
import { act, cleanup, render, screen, within } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { Scheduler } from './index'
import { dragAnnouncements } from './react/dnd'
import { resolveTranslations } from './core/format'
import type { CalendarEvent, ToolbarProps } from './types'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
const day = new Date(2026, 9, 14)
const review: CalendarEvent = { id: 'rv', title: 'Design review', start: new Date(2026, 9, 14, 10), end: new Date(2026, 9, 14, 11) }
const narrow = () => vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
  return this.classList.contains('ck-root') ? 375 : 0
})

describe('polish', () => {
  test("drag: no dnd-kit keyboard instructions in English, announcements in the calendar's language", () => {
    render(<Scheduler view="day" date={day} events={[review]} />)
    expect(screen.queryByText(/To pick up a draggable item/)).toBeNull()
    const a = dragAnnouncements(resolveTranslations('fr'))
    const active = { data: { current: { event: review } } } as never
    expect(a.onDragStart({ active })).toBe('Déplacement de Design review')
    expect(a.onDragEnd({ active, over: {} } as never)).toBe('Design review déplacé')
    expect(a.onDragEnd({ active, over: null } as never)).toBe('Déplacement de Design review annulé')
    expect(a.onDragOver({ active, over: null } as never)).toBeUndefined()
  })

  test('colour swatches are named by colour, not by hex code', () => {
    render(<Scheduler view="day" date={day} events={[review]} />)
    act(() => screen.getByRole('button', { name: /^Design review/ }).click())
    act(() => within(screen.getByRole('dialog')).getByRole('button', { name: 'Edit' }).click())
    act(() => screen.getByRole('button', { name: 'Event color' }).click())
    expect(screen.getByRole('button', { name: 'Blue' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '#3b82f6' })).toBeNull()
  })

  test('timezone choices are buttons (keyboard), the current one pressed', () => {
    render(<Scheduler view="week" date={day} timezone="Europe/Paris" onTimezoneChange={() => {}} />)
    act(() => screen.getByRole('button', { name: /Paris/ }).click())
    expect(screen.getByRole('button', { name: /New York/ })).toBeTruthy()
    expect(screen.getAllByRole('button', { pressed: true }).some((b) => /Paris/.test(b.textContent ?? ''))).toBe(true)
  })

  test('phone: the scroll area leaves room under the floating Create; a custom Toolbar is told it is compact', () => {
    narrow()
    const seen: boolean[] = []
    const Toolbar = (props: ToolbarProps) => { seen.push(!!props.compact); return <div /> }
    const { container } = render(<Scheduler view="day" date={day} events={[]} components={{ Toolbar }} />)
    expect(container.querySelector('.ck\\:pb-24')).not.toBeNull()
    expect(seen.at(-1)).toBe(true)
  })
})
