import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { createCalendar } from 'calendarkit-pro/core'
import type { CalendarEvent } from '../types'
import { getEventProps, getResizeHandleProps, getSlotProps } from './propGetters'

afterEach(cleanup)

const now = () => new Date(2026, 9, 14, 11, 52)
const review: CalendarEvent = { id: 'rv', title: 'Review', start: new Date(2026, 9, 14, 10), end: new Date(2026, 9, 14, 11) }

describe('getEventProps', () => {
  test('a native button with the full name; a click opens the event and calls onClick', () => {
    const calendar = createCalendar({ events: [review], now })
    const onClick = vi.fn()
    render(<button {...getEventProps(calendar, review, { label: 'Review, Wednesday 14 October, 10:00 to 11:00', onClick })}>Review</button>)
    const button = screen.getByRole('button', { name: 'Review, Wednesday 14 October, 10:00 to 11:00' })
    expect(button.getAttribute('type')).toBe('button')
    expect(button.dataset.eventId).toBe('rv')
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledWith(review)
    expect(calendar.getState().dialog).toEqual({ kind: 'event', eventId: 'rv' })
  })

  test('context menu only when editable; continuation and all-day flags', () => {
    const onContextMenu = vi.fn()
    const day: CalendarEvent = { ...review, id: 'd', allDay: true }
    expect(getEventProps(createCalendar({ events: [day], now }), day, { onContextMenu, continuesAfter: true })).toMatchObject({ 'data-all-day': 'true', 'data-continues': 'after', onContextMenu: expect.any(Function) })
    expect(getEventProps(createCalendar({ events: [day], readOnly: true, now }), day, { onContextMenu }).onContextMenu).toBeUndefined()
  })
})

describe('getSlotProps', () => {
  test('opens the form at the slot; disabled in readOnly', () => {
    const calendar = createCalendar({ now })
    render(<button {...getSlotProps(calendar, new Date(2026, 9, 15, 9), { label: 'New event Thursday 9:00', resourceId: 'room-b', editor: true })} />)
    fireEvent.click(screen.getByRole('button', { name: 'New event Thursday 9:00' }))
    expect(calendar.getState().dialog).toMatchObject({ kind: 'editor', draft: { start: new Date(2026, 9, 15, 9), resourceId: 'room-b' } })
    const readOnly = getSlotProps(createCalendar({ readOnly: true, now }), new Date(2026, 9, 15, 9))
    expect(readOnly).toMatchObject({ 'aria-disabled': true })
    expect(readOnly.onClick).toBeUndefined()
  })
})

describe('getResizeHandleProps', () => {
  test('dragging the handle snaps the end to 15 minutes and calls resize; a cancel changes nothing', () => {
    const onEventResize = vi.fn()
    const onPreview = vi.fn()
    const calendar = createCalendar({ events: [review], onEventResize, now })
    render(<div data-testid="handle" {...getResizeHandleProps(calendar, review, { pixelsPerMinute: 1, onPreview })} />)
    const handle = screen.getByTestId('handle')
    fireEvent.pointerDown(handle, { clientY: 100 })
    fireEvent.pointerMove(document, { clientY: 140 }) // +40 px = +40 min → snapped to +45
    expect(onPreview).toHaveBeenLastCalledWith(new Date(2026, 9, 14, 11, 45))
    fireEvent.pointerCancel(document)
    fireEvent.pointerUp(document)
    expect(onEventResize).not.toHaveBeenCalled()
    expect(onPreview).toHaveBeenLastCalledWith(null)
    fireEvent.pointerDown(handle, { clientY: 100 })
    fireEvent.pointerMove(document, { clientY: 160 })
    fireEvent.pointerUp(document)
    expect(onEventResize).toHaveBeenCalledWith(review, review.start, new Date(2026, 9, 14, 12))
  })

  test('the end never goes below one snap step', () => {
    const onEventResize = vi.fn()
    const calendar = createCalendar({ events: [review], onEventResize, now })
    render(<div data-testid="handle" {...getResizeHandleProps(calendar, review, { pixelsPerMinute: 1 })} />)
    fireEvent.pointerDown(screen.getByTestId('handle'), { clientY: 100 })
    fireEvent.pointerMove(document, { clientY: -500 })
    fireEvent.pointerUp(document)
    expect(onEventResize.mock.calls[0][2]).toEqual(new Date(2026, 9, 14, 10, 15))
  })
})
