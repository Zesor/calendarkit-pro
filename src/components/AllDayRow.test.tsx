import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { DndContext } from '@dnd-kit/core'
import { fr as frLocale } from 'date-fns/locale'
import { resolveTranslations } from '../core/format'
import type { CalendarEvent } from '../types'
import { AllDayRow } from './AllDayRow'

afterEach(cleanup)

const fr = resolveTranslations('fr')
const week = Array.from({ length: 7 }, (_, i) => new Date(2026, 9, 12 + i))
const allDay = (id: string, from: number, toExclusive: number, extra: Partial<CalendarEvent> = {}): CalendarEvent =>
  ({ id, title: id, start: new Date(2026, 9, from), end: new Date(2026, 9, toExclusive), allDay: true, ...extra })

const renderRow = (events: CalendarEvent[], props: Partial<React.ComponentProps<typeof AllDayRow>> = {}) =>
  render(<DndContext><AllDayRow days={week} dayEvents={events} gutterClassName="w-16" translations={fr} locale={frLocale} {...props} /></DndContext>)

describe('AllDayRow', () => {
  test('shows bars with the translated label, even when empty', () => {
    renderRow([])
    expect(screen.getByText('Toute la journée')).toBeTruthy()
    cleanup()
    renderRow([allDay('Conférence', 12, 15)])
    expect(screen.getByRole('button', { name: /Conférence, 12 oct\. – 14 oct\./ })).toBeTruthy()
  })

  test('collapses beyond 2 lanes with "+N", and expands / collapses back', () => {
    renderRow([allDay('A', 14, 15), allDay('B', 14, 15), allDay('C', 14, 15), allDay('D', 14, 15)])
    expect(screen.queryByText('C')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '+2 de plus' }))
    expect(screen.getByText('D')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Réduire' }))
    expect(screen.queryByText('D')).toBeNull()
  })

  test('clicking an empty day creates an all-day event on that day (not in readOnly)', () => {
    const onSlotClick = vi.fn()
    const { container, rerender } = renderRow([], { onSlotClick })
    fireEvent.click(container.querySelectorAll('[data-all-day-row] .cursor-pointer')[2])
    expect(onSlotClick).toHaveBeenCalledWith(new Date(2026, 9, 14))
    rerender(<DndContext><AllDayRow days={week} dayEvents={[]} gutterClassName="w-16" translations={fr} readonly onSlotClick={onSlotClick} /></DndContext>)
    expect(container.querySelectorAll('[data-all-day-row] .cursor-pointer')).toHaveLength(0)
  })

  test('bars continuing across the row show chevrons; the resize handle is only on the last segment', () => {
    renderRow([allDay('Vacances', 8, 22)], { onDayEventResize: () => {} }) // Thu 8 → Wed 21, beyond both edges
    expect(screen.getByText('‹')).toBeTruthy()
    expect(screen.getByText('›')).toBeTruthy()
    expect(screen.queryByTestId('all-day-resize')).toBeNull()
  })

  test('stretching the right edge by two columns reports the new last day', () => {
    const onDayEventResize = vi.fn()
    renderRow([allDay('Salon', 14, 15)], { onDayEventResize }) // Wed
    const handle = screen.getByTestId('all-day-resize')
    const bar = handle.parentElement as HTMLElement
    bar.getBoundingClientRect = () => ({ width: 100, height: 18, left: 0, top: 0, right: 100, bottom: 18, x: 0, y: 0, toJSON: () => ({}) })
    fireEvent.pointerDown(handle, { clientX: 100 })
    fireEvent.pointerMove(document, { clientX: 300 })
    fireEvent.pointerUp(document)
    expect(onDayEventResize).toHaveBeenCalledWith(expect.objectContaining({ id: 'Salon' }), new Date(2026, 9, 16))
  })

  test('the click that ends a stretch does not open the event; a plain click does', () => {
    const onEventClick = vi.fn()
    renderRow([allDay('Salon', 14, 15)], { onDayEventResize: () => {}, onEventClick })
    const handle = screen.getByTestId('all-day-resize')
    const bar = handle.closest('[role="button"]') as HTMLElement
    ;(handle.parentElement as HTMLElement).getBoundingClientRect = () => ({ width: 100, height: 18, left: 0, top: 0, right: 100, bottom: 18, x: 0, y: 0, toJSON: () => ({}) })
    fireEvent.pointerDown(handle, { clientX: 100 })
    fireEvent.pointerMove(document, { clientX: 300 })
    fireEvent.pointerUp(document)
    fireEvent.click(bar)
    expect(onEventClick).not.toHaveBeenCalled()
    fireEvent.click(bar)
    expect(onEventClick).toHaveBeenCalledTimes(1)
  })

  test('a cancelled stretch (touch interrupted) changes nothing', () => {
    const onDayEventResize = vi.fn()
    renderRow([allDay('Salon', 14, 15)], { onDayEventResize })
    const handle = screen.getByTestId('all-day-resize')
    const bar = handle.parentElement as HTMLElement
    bar.getBoundingClientRect = () => ({ width: 100, height: 18, left: 0, top: 0, right: 100, bottom: 18, x: 0, y: 0, toJSON: () => ({}) })
    fireEvent.pointerDown(handle, { clientX: 100 })
    fireEvent.pointerMove(document, { clientX: 300 })
    fireEvent.pointerCancel(document)
    fireEvent.pointerUp(document)
    expect(onDayEventResize).not.toHaveBeenCalled()
    expect(parseFloat((handle.closest('[role="button"]') as HTMLElement).style.width)).toBeCloseTo((1 / 7) * 100, 3)
  })

  test('no resize handle in readOnly or when resizable is false', () => {
    renderRow([allDay('Salon', 14, 15)], { onDayEventResize: () => {}, readonly: true })
    expect(screen.queryByTestId('all-day-resize')).toBeNull()
    cleanup()
    renderRow([allDay('Salon', 14, 15, { resizable: false })], { onDayEventResize: () => {} })
    expect(screen.queryByTestId('all-day-resize')).toBeNull()
  })
})
