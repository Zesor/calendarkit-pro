import { act, renderHook } from '@testing-library/react'
import type { DragEndEvent } from '@dnd-kit/core'
import { describe, expect, test, vi } from 'vitest'
import type { CalendarEvent } from '../types'
import { expansionRange, useCalendarLogic } from './useCalendarLogic'

const standup: CalendarEvent = {
  id: 's',
  title: 'Standup',
  start: new Date(2026, 9, 5, 9, 0),
  end: new Date(2026, 9, 5, 9, 30),
  recurrence: { freq: 'DAILY' },
}
const single: CalendarEvent = { id: 'x', title: 'One-off', start: new Date(2026, 9, 15, 14), end: new Date(2026, 9, 15, 15) }

const setup = (props: Partial<Parameters<typeof useCalendarLogic>[0]> = {}) =>
  renderHook(() => useCalendarLogic({ events: [standup, single], date: new Date(2026, 9, 15), view: 'week', ...props }))

const occurrenceOn = (events: CalendarEvent[], day: number) =>
  events.find((e) => e.originalEventId === 's' && e.start.getDate() === day)!

const dragEnd = (event: CalendarEvent, overDate: Date, resourceId?: string) =>
  ({ active: { data: { current: { event } } }, over: { data: { current: { date: overDate, resourceId } } } }) as unknown as DragEndEvent

describe('useCalendarLogic', () => {
  test('R4: expansion covers the focused month ± 1 month plus 37 days', () => {
    const range = expansionRange(new Date(2026, 9, 1))
    expect(range.start).toEqual(new Date(2026, 7, 30)) // week start (Sunday) before 1 Sep
    expect(range.end).toEqual(new Date(2027, 0, 6, 23, 59, 59, 999)) // 30 Nov + 37 days
  })

  test('expands occurrences and keeps one-off events', () => {
    const { result } = setup()
    expect(occurrenceOn(result.current.expandedEvents, 15)).toBeDefined()
    expect(result.current.expandedEvents).toContain(single)
  })

  test('invalid events are skipped instead of crashing', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { result } = setup({ events: [single, { ...single, id: 'bad', start: 'nope' as unknown as Date }] })
    expect(result.current.expandedEvents.map((e) => e.id)).toEqual(['x'])
  })

  test('R5: saving an edited occurrence updates the master, shifted, without occurrence fields', () => {
    const onEventUpdate = vi.fn()
    const { result } = setup({ onEventUpdate })
    const occurrence = occurrenceOn(result.current.expandedEvents, 15)
    act(() => result.current.handleEventClickInternal(occurrence))
    act(() => result.current.handleModalSave({ ...occurrence, title: 'Daily', start: new Date(2026, 9, 15, 10), end: new Date(2026, 9, 15, 10, 30) }))
    const updated = onEventUpdate.mock.calls[0][0] as CalendarEvent
    expect(updated).toMatchObject({ id: 's', title: 'Daily', start: new Date(2026, 9, 5, 10), end: new Date(2026, 9, 5, 10, 30) })
    expect(updated.originalEventId).toBeUndefined()
    expect(updated.occurrenceStart).toBeUndefined()
  })

  test('R6: deleting an occurrence calls onOccurrenceDelete with the series excluding that date', () => {
    const onOccurrenceDelete = vi.fn()
    const onEventDelete = vi.fn()
    const { result } = setup({ onOccurrenceDelete, onEventDelete })
    const occurrence = occurrenceOn(result.current.expandedEvents, 15)
    act(() => result.current.handleEventDelete(occurrence))
    expect(onEventDelete).not.toHaveBeenCalled()
    const [received, series] = onOccurrenceDelete.mock.calls[0]
    expect(received).toBe(occurrence)
    expect(series.recurrence.exdates).toEqual([new Date(2026, 9, 15, 9, 0)])
  })

  test('R6: without onOccurrenceDelete, deleting an occurrence deletes the series (unchanged behaviour)', () => {
    const onEventDelete = vi.fn()
    const { result } = setup({ onEventDelete })
    const occurrence = occurrenceOn(result.current.expandedEvents, 15)
    act(() => result.current.handleEventClickInternal(occurrence))
    act(() => result.current.handleModalDelete(occurrence.id))
    expect(onEventDelete).toHaveBeenCalledWith('s')
  })

  test('R7: duplicating an occurrence creates a single, non-recurring event one day later', () => {
    const onEventCreate = vi.fn()
    const { result } = setup({ onEventCreate })
    act(() => result.current.handleEventDuplicate(occurrenceOn(result.current.expandedEvents, 15)))
    const copy = onEventCreate.mock.calls[0][0] as CalendarEvent
    expect(copy.recurrence).toBeUndefined()
    expect(copy.originalEventId).toBeUndefined()
    expect(copy.start).toEqual(new Date(2026, 9, 16, 9, 0))
    expect(copy.title).toBe('Standup (Copy)')
  })

  test('D1: resizing an occurrence sends the master to onEventResize and onEventUpdate', () => {
    const onEventResize = vi.fn()
    const onEventUpdate = vi.fn()
    const { result } = setup({ onEventResize, onEventUpdate })
    act(() => result.current.handleEventResize(occurrenceOn(result.current.expandedEvents, 15), new Date(2026, 9, 15, 10)))
    expect(onEventResize).toHaveBeenCalledWith(standup, new Date(2026, 9, 5, 9, 0), new Date(2026, 9, 5, 10, 0))
    expect(onEventUpdate.mock.calls[0][0]).toMatchObject({ id: 's', end: new Date(2026, 9, 5, 10, 0) })
  })

  test('D2: dropping calls onEventDrop and onEventUpdate once with the same dates', () => {
    const onEventDrop = vi.fn()
    const onEventUpdate = vi.fn()
    const { result } = setup({ onEventDrop, onEventUpdate })
    act(() => result.current.handleDragEnd(dragEnd(single, new Date(2026, 9, 16, 9, 0))))
    expect(onEventDrop).toHaveBeenCalledTimes(1)
    expect(onEventDrop).toHaveBeenCalledWith(single, new Date(2026, 9, 16, 9, 0), new Date(2026, 9, 16, 10, 0))
    expect(onEventUpdate).toHaveBeenCalledTimes(1)
    expect(onEventUpdate.mock.calls[0][0]).toMatchObject({ id: 'x', start: new Date(2026, 9, 16, 9, 0) })
  })

  test('R5: dropping an occurrence moves the whole series', () => {
    const onEventUpdate = vi.fn()
    const { result } = setup({ onEventUpdate })
    act(() => result.current.handleDragEnd(dragEnd(occurrenceOn(result.current.expandedEvents, 15), new Date(2026, 9, 15, 11, 0))))
    expect(onEventUpdate.mock.calls[0][0]).toMatchObject({ id: 's', start: new Date(2026, 9, 5, 11, 0) })
  })

  test('a slot clicked in the resource view pre-assigns its resource to the new event', () => {
    const onEventCreate = vi.fn()
    const { result } = setup({ onEventCreate, view: 'resource' })
    act(() => result.current.handleTimeSlotClick(new Date(2026, 9, 15, 9), 'room-a'))
    act(() => result.current.handleModalSave({ title: 'Booked', start: new Date(2026, 9, 15, 9), end: new Date(2026, 9, 15, 10) }))
    expect(onEventCreate.mock.calls[0][0]).toMatchObject({ title: 'Booked', resourceId: 'room-a' })
  })

  test('readOnly: resizing and clicking a slot do nothing', () => {
    const onEventResize = vi.fn()
    const onEventUpdate = vi.fn()
    const { result } = setup({ readOnly: true, onEventResize, onEventUpdate })
    act(() => result.current.handleEventResize(single, new Date(2026, 9, 15, 16)))
    act(() => result.current.handleTimeSlotClick(new Date(2026, 9, 15, 9)))
    expect(onEventResize).not.toHaveBeenCalled()
    expect(onEventUpdate).not.toHaveBeenCalled()
    expect(result.current.isModalOpen).toBe(false)
  })

  test('events with ISO string dates are rendered and updated with Date objects', () => {
    const onEventUpdate = vi.fn()
    const fromJson = { id: 'j', title: 'From JSON', start: '2026-10-15T08:00:00Z', end: '2026-10-15T09:00:00Z' } as unknown as CalendarEvent
    const { result } = setup({ events: [fromJson], onEventUpdate })
    const rendered = result.current.expandedEvents[0]
    expect(rendered.start).toEqual(new Date('2026-10-15T08:00:00Z'))
    act(() => result.current.handleDragEnd(dragEnd(rendered, new Date(2026, 9, 16, 9, 0))))
    expect(onEventUpdate.mock.calls[0][0].start).toEqual(new Date(2026, 9, 16, 9, 0))
  })

  test('C6: handlers keep a stable identity across renders', () => {
    const { result, rerender } = setup({ onEventClick: () => {} })
    const before = result.current.handleTimeSlotClick
    rerender()
    expect(result.current.handleTimeSlotClick).toBe(before)
  })
})
