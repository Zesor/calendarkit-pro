import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { DndContext } from '@dnd-kit/core'
import { fr as frLocale } from 'date-fns/locale'
import { resolveTranslations } from '../core/format'
import type { CalendarEvent } from '../types'
import { Scheduler } from '../index'
import { MonthView } from './MonthView'
import { DayView } from './DayView'
import { ResourceView } from './ResourceView'
import { AgendaView } from './AgendaView'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const fr = resolveTranslations('fr')
const day = new Date(2026, 9, 15)
const at = (h: number, id = `e${h}`): CalendarEvent => ({ id, title: `Event ${h}`, start: new Date(2026, 9, 15, h), end: new Date(2026, 9, 15, h, 30) })

describe('translated views (I1)', () => {
  test('U7: month view "+N more" is translated and opens the day', () => {
    const onDateClick = vi.fn()
    render(<DndContext><MonthView currentDate={day} events={[1, 2, 3, 4, 5, 6].map((h) => at(h))} translations={fr} locale={frLocale} onDateClick={onDateClick} /></DndContext>)
    fireEvent.click(screen.getByRole('button', { name: '+2 de plus' }))
    expect(onDateClick).toHaveBeenCalledWith(day)
  })

  test('day view "Today" badge is translated', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 15, 10))
    render(<DndContext><DayView currentDate={day} events={[]} translations={fr} /></DndContext>)
    expect(screen.getByText("Aujourd'hui")).toBeTruthy()
  })

  test('resource view header and ids are translated', () => {
    render(<DndContext><ResourceView currentDate={day} events={[]} resources={[{ id: 'r1', label: 'Salle A' }]} translations={fr} /></DndContext>)
    expect(screen.getByText('Ressources')).toBeTruthy()
    expect(screen.getByText('ID : r1')).toBeTruthy()
  })

  test('agenda view renders translated day labels and times in the display zone', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 15, 8))
    render(<AgendaView currentDate={day} events={[at(9)]} translations={fr} locale={frLocale} />)
    expect(screen.getByText("Aujourd'hui")).toBeTruthy()
    expect(screen.getByText('1 événement')).toBeTruthy()
    expect(screen.getByText('9:00 - 9:30')).toBeTruthy()
  })
})

describe('Scheduler wiring', () => {
  test('right-clicking an event opens the context menu (it was never wired)', () => {
    render(<Scheduler events={[at(9, 'ctx')]} view="agenda" date={day} />)
    fireEvent.contextMenu(screen.getByText('Event 9'))
    expect(screen.getByText('Duplicate')).toBeTruthy()
  })

  const mobileCreateButton = (container: HTMLElement) => container.querySelector('.md\\:hidden button')

  test('the mobile create button has an accessible name (A1)', () => {
    const { container } = render(<Scheduler events={[]} view="agenda" date={day} />)
    expect(mobileCreateButton(container)?.getAttribute('aria-label')).toBe('Create Event')
  })

  test('U3: readOnly shows no context menu and no mobile create button', () => {
    const { container } = render(<Scheduler events={[at(9, 'ro')]} view="agenda" date={day} readOnly />)
    fireEvent.contextMenu(screen.getByText('Event 9'))
    expect(screen.queryByText('Duplicate')).toBeNull()
    expect(mobileCreateButton(container)).toBeNull()
  })

  test('numeric calendar ids (from JSON) are matched like before', () => {
    const numeric = { ...at(9, 'num'), calendarId: 1 as unknown as string }
    render(<Scheduler events={[numeric]} view="agenda" date={day} calendars={[{ id: 1 as unknown as string, label: 'Work', active: true }]} />)
    expect(screen.getByText('Event 9')).toBeTruthy()
  })

  test('readOnly: time slots are not clickable', () => {
    const { container } = render(<Scheduler events={[]} view="week" date={day} readOnly />)
    expect(container.querySelector('.cursor-pointer[class*="absolute"]')).toBeNull()
  })
})
