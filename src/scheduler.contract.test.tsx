// 1.x contract: the README's controlled usage (events + callbacks + renderEventForm) behaves the
// same now that the Scheduler runs on the calendar engine.
import { act, cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { Scheduler } from './index'
import type { CalendarEvent, CalendarProps } from './types'

afterEach(cleanup)

const review: CalendarEvent = { id: 'rv', title: 'Design review', start: new Date(2026, 9, 14, 10), end: new Date(2026, 9, 14, 11) }
const standup: CalendarEvent = { id: 'su', title: 'Standup', start: new Date(2026, 9, 5, 9), end: new Date(2026, 9, 5, 9, 30), recurrence: { freq: 'WEEKLY' } }
type FormProps = Parameters<NonNullable<CalendarProps['renderEventForm']>>[0]

function setup(props: Partial<CalendarProps> = {}) {
  const form: { current?: FormProps } = {}
  const renderEventForm = (p: FormProps) => {
    form.current = p
    return p.isOpen ? <div role="dialog">{p.event ? p.event.title : 'new event'}</div> : null
  }
  render(<Scheduler events={[review, standup]} view="week" date={new Date(2026, 9, 14)} renderEventForm={renderEventForm} {...props} />)
  return form
}

describe('Scheduler 1.x contract', () => {
  test('a click opens the form with the event; saving merges the fields into onEventUpdate; deleting calls onEventDelete', () => {
    const onEventUpdate = vi.fn()
    const onEventDelete = vi.fn()
    const onEventClick = vi.fn()
    const form = setup({ onEventUpdate, onEventDelete, onEventClick })
    act(() => screen.getByText('Design review').click())
    expect(onEventClick).toHaveBeenCalledWith(review)
    expect(form.current).toMatchObject({ isOpen: true, event: review })
    act(() => form.current!.onSave({ title: 'Design review v2', description: 'Slides' }))
    expect(onEventUpdate).toHaveBeenCalledWith({ ...review, title: 'Design review v2', description: 'Slides' })
    expect(form.current!.isOpen).toBe(false)
    act(() => screen.getByText('Design review').click())
    act(() => form.current!.onDelete!('rv'))
    expect(onEventDelete).toHaveBeenCalledWith('rv')
  })

  test('saving an occurrence of a series updates the whole series', () => {
    const onEventUpdate = vi.fn()
    const form = setup({ onEventUpdate })
    act(() => screen.getAllByText('Standup')[0].click())
    const occurrence = form.current!.event!
    expect(occurrence.originalEventId).toBe('su')
    act(() => form.current!.onSave({ start: new Date(occurrence.start.getTime() + 3600000), end: new Date(occurrence.end.getTime() + 3600000) }))
    expect(onEventUpdate.mock.calls[0][0]).toMatchObject({ id: 'su', start: new Date(2026, 9, 5, 10) })
  })

  test('the create button opens an empty form; saving calls onEventCreate', () => {
    const onEventCreate = vi.fn()
    const form = setup({ onEventCreate })
    act(() => screen.getByRole('button', { name: 'Create', hidden: true }).click())
    expect(form.current).toMatchObject({ isOpen: true, event: null })
    expect(form.current!.initialDate).toBeInstanceOf(Date)
    act(() => form.current!.onSave({ title: 'Call', start: new Date(2026, 9, 15, 9), end: new Date(2026, 9, 15, 10) }))
    expect(onEventCreate).toHaveBeenCalledWith(expect.objectContaining({ title: 'Call', start: new Date(2026, 9, 15, 9) }))
  })

  test('controlled navigation and view: callbacks fire with the next week and the chosen view', () => {
    const onDateChange = vi.fn()
    const onViewChange = vi.fn()
    setup({ onDateChange, onViewChange })
    act(() => screen.getByRole('button', { name: 'Next' }).click())
    expect(onDateChange).toHaveBeenCalledWith(new Date(2026, 9, 21))
    act(() => screen.getByRole('button', { name: 'Month' }).click())
    expect(onViewChange).toHaveBeenCalledWith('month')
  })

  test('readOnly: onEventClick fires but the form stays closed', () => {
    const onEventClick = vi.fn()
    const form = setup({ readOnly: true, onEventClick })
    act(() => screen.getByText('Design review').click())
    expect(onEventClick).toHaveBeenCalledWith(review)
    expect(form.current!.isOpen).toBe(false)
  })

  test('renders on the server (renderToString) with the events', () => {
    const html = renderToString(<Scheduler events={[review]} view="week" date={new Date(2026, 9, 14)} />)
    expect(html).toContain('Design review')
  })
})

describe('review fixes (A2)', () => {
  test('C1: an uncontrolled Scheduler without events survives re-renders', () => {
    const onDateChange = vi.fn()
    render(<Scheduler onDateChange={onDateChange} />)
    act(() => screen.getByRole('button', { name: 'Next' }).click())
    act(() => screen.getByRole('button', { name: 'Next' }).click())
    expect(onDateChange).toHaveBeenCalledTimes(2)
  })

  test('I2: an open event keeps its snapshot when the parent passes new event objects', () => {
    const form: { current?: FormProps } = {}
    const renderEventForm = (p: FormProps) => { form.current = p; return null }
    function Parent() {
      const [n, setN] = React.useState(0)
      const events = [{ ...review }] // fresh objects on every render, like a refetch
      return <><Scheduler events={events} view="week" date={new Date(2026, 9, 14)} renderEventForm={renderEventForm} /><button onClick={() => setN(n + 1)}>refetch {n}</button></>
    }
    render(<Parent />)
    act(() => screen.getByText('Design review').click())
    const opened = form.current!.event
    act(() => screen.getByRole('button', { name: /refetch/ }).click())
    expect(form.current!.isOpen).toBe(true)
    expect(form.current!.event).toBe(opened)
  })

  test('I3: saving after the form closed still updates the event (no duplicate)', () => {
    const onEventUpdate = vi.fn()
    const onEventCreate = vi.fn()
    const form = setup({ onEventUpdate, onEventCreate })
    act(() => screen.getByText('Design review').click())
    act(() => form.current!.onClose())
    expect(form.current!.event).toMatchObject({ id: 'rv' }) // the last event stays available while closing
    act(() => form.current!.onSave({ title: 'Design review v3' }))
    expect(onEventUpdate).toHaveBeenCalledWith(expect.objectContaining({ id: 'rv', title: 'Design review v3' }))
    expect(onEventCreate).not.toHaveBeenCalled()
  })

  test('I4: onEventCreate receives the form fields without an id the engine generated (1.x payload)', () => {
    const onEventCreate = vi.fn()
    const form = setup({ onEventCreate })
    act(() => screen.getByRole('button', { name: 'Create', hidden: true }).click())
    act(() => form.current!.onSave({ title: 'Call', start: new Date(2026, 9, 15, 9), end: new Date(2026, 9, 15, 10) }))
    expect(onEventCreate).toHaveBeenCalledWith({ title: 'Call', start: new Date(2026, 9, 15, 9), end: new Date(2026, 9, 15, 10) })
  })
})
