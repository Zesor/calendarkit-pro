import { afterEach, describe, expect, test, vi } from 'vitest'
import type { CalendarEvent } from '../types'
import { createCalendar } from './store'
import { resetWarnings } from './warn'

afterEach(() => resetWarnings())

const now = () => new Date(2026, 9, 14, 11, 52) // Wednesday 14 October 2026
const standup: CalendarEvent = { id: 'su', title: 'Standup', start: new Date(2026, 9, 5, 9), end: new Date(2026, 9, 5, 9, 30), recurrence: { freq: 'WEEKLY' }, calendarId: 'work' }
const lunch: CalendarEvent = { id: 'lu', title: 'Lunch', start: new Date(2026, 9, 14, 12, 30), end: new Date(2026, 9, 14, 13, 30), calendarId: 'perso' }

describe('createCalendar: state', () => {
  test('defaults: week view, today, events normalized and series expanded over the focused months', () => {
    const cal = createCalendar({ defaultEvents: [standup, lunch], now })
    const s = cal.getState()
    expect(s.view).toBe('week')
    expect(s.date).toEqual(now())
    expect(s.events).toHaveLength(2)
    expect(s.occurrences.filter((e) => e.originalEventId === 'su').length).toBeGreaterThan(8)
    expect(s.dialog).toBeNull()
  })

  test('snapshots are stable until something changes', () => {
    const cal = createCalendar({ defaultEvents: [lunch], now })
    const first = cal.getState()
    expect(cal.getState()).toBe(first)
    cal.setView('day')
    expect(cal.getState()).not.toBe(first)
  })

  test('subscribers are notified, and can unsubscribe', () => {
    const cal = createCalendar({ now })
    const listener = vi.fn()
    const off = cal.subscribe(listener)
    cal.setView('month')
    off()
    cal.setView('day')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  test('string and timestamp dates are coerced, invalid events dropped with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const raw = [{ ...lunch, start: '2026-10-14T10:30:00Z' }, { ...lunch, id: 'bad', start: 'nope' }] as unknown as CalendarEvent[]
    const s = createCalendar({ defaultEvents: raw, now }).getState()
    expect(s.events.map((e) => e.id)).toEqual(['lu'])
    expect(s.events[0].start).toEqual(new Date('2026-10-14T10:30:00Z'))
    expect(warn).toHaveBeenCalled()
  })

  test('controlled events follow setOptions', () => {
    const cal = createCalendar({ events: [lunch], now })
    cal.setOptions({ events: [] })
    expect(cal.getState().events).toEqual([])
  })

  test('hidden calendars are filtered out of `visible` only', () => {
    const cal = createCalendar({ defaultEvents: [standup, lunch], now })
    cal.toggleCalendar('work')
    expect(cal.getState().visible.some((e) => e.calendarId === 'work')).toBe(false)
    expect(cal.getState().occurrences.some((e) => e.calendarId === 'work')).toBe(true)
    cal.toggleCalendar('work')
    expect(cal.getState().hiddenCalendars).toEqual([])
  })
})

describe('createCalendar: navigation', () => {
  test('prev / next step by the view unit, today returns to now', () => {
    const cal = createCalendar({ now })
    cal.navigate('next')
    expect(cal.getState().date).toEqual(new Date(2026, 9, 21, 11, 52))
    cal.setView('month')
    cal.navigate('prev')
    expect(cal.getState().date).toEqual(new Date(2026, 8, 21, 11, 52))
    cal.setView('day')
    cal.navigate('prev')
    expect(cal.getState().date).toEqual(new Date(2026, 8, 20, 11, 52))
    cal.setView('agenda')
    cal.navigate('next')
    expect(cal.getState().date).toEqual(new Date(2026, 8, 27, 11, 52))
    cal.navigate('today')
    expect(cal.getState().date).toEqual(now())
  })

  test('moving to another month expands the series there', () => {
    const cal = createCalendar({ defaultEvents: [standup], now })
    cal.navigate(new Date(2027, 2, 10))
    expect(cal.getState().occurrences.some((e) => e.start.getFullYear() === 2027 && e.start.getMonth() === 2)).toBe(true)
  })

  test('controlled view and date: callbacks fire, state follows the props', () => {
    const onViewChange = vi.fn()
    const onDateChange = vi.fn()
    const cal = createCalendar({ view: 'week', date: new Date(2026, 9, 14), onViewChange, onDateChange, now })
    cal.setView('month')
    cal.navigate('next')
    expect(onViewChange).toHaveBeenCalledWith('month')
    expect(onDateChange).toHaveBeenCalledWith(new Date(2026, 9, 21))
    expect(cal.getState().view).toBe('week')
    cal.setOptions({ view: 'month' })
    expect(cal.getState().view).toBe('month')
  })
})

describe('createCalendar: dialogs and drafts', () => {
  test('openSlot opens a one-hour quick draft; all-day drafts cover the day', () => {
    const cal = createCalendar({ now })
    cal.openSlot(new Date(2026, 9, 15, 14))
    expect(cal.getState().dialog).toMatchObject({ kind: 'quick', draft: { start: new Date(2026, 9, 15, 14), end: new Date(2026, 9, 15, 15), allDay: false, dirty: false } })
    cal.openSlot(new Date(2026, 9, 15, 14), { allDay: true, editor: true })
    expect(cal.getState().dialog).toMatchObject({ kind: 'editor', draft: { start: new Date(2026, 9, 15), end: new Date(2026, 9, 16), allDay: true } })
  })

  test('a typed sentence moves the draft and keeps the recognised words for display', () => {
    const cal = createCalendar({ now, language: 'fr' })
    cal.openSlot(new Date(2026, 9, 14, 15))
    cal.updateDraft({ title: 'Déj. avec Léa demain 13h pendant 2h' })
    const d = cal.getState().dialog
    expect(d?.kind === 'quick' && d.draft).toMatchObject({ start: new Date(2026, 9, 15, 13), end: new Date(2026, 9, 15, 15), dirty: true, savedTitle: 'Déj. avec Léa' })
    expect(d?.kind === 'quick' && d.draft.tokens.map((t) => t.kind)).toEqual(['date', 'time', 'duration'])
  })

  test('openEditor promotes the quick draft, or loads an existing event', () => {
    const cal = createCalendar({ defaultEvents: [lunch], now })
    cal.openSlot(new Date(2026, 9, 15, 14))
    cal.updateDraft({ title: 'Call' })
    cal.openEditor()
    expect(cal.getState().dialog).toMatchObject({ kind: 'editor', draft: { title: 'Call' } })
    cal.openEditor('lu')
    expect(cal.getState().dialog).toMatchObject({ kind: 'editor', eventId: 'lu', draft: { title: 'Lunch', start: lunch.start } })
  })

  test('openEvent / openMore / closeDialog; unknown ids warn and do nothing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const cal = createCalendar({ defaultEvents: [lunch], now })
    cal.openEvent('lu')
    expect(cal.getState().dialog).toEqual({ kind: 'event', eventId: 'lu' })
    cal.openMore(['lu'])
    expect(cal.getState().dialog).toEqual({ kind: 'more', eventIds: ['lu'] })
    cal.closeDialog()
    cal.openEvent('ghost')
    expect(cal.getState().dialog).toBeNull()
    expect(warn).toHaveBeenCalledTimes(1)
  })

  test('readOnly: no drafts or editor, but events can still be read', () => {
    const cal = createCalendar({ defaultEvents: [lunch], readOnly: true, now })
    cal.openSlot(new Date(2026, 9, 15, 14))
    cal.openEditor('lu')
    expect(cal.getState().dialog).toBeNull()
    cal.openEvent('lu')
    expect(cal.getState().dialog).toEqual({ kind: 'event', eventId: 'lu' })
  })
})

describe('createCalendar: no-op changes keep the snapshot (review I1)', () => {
  test('setOptions with only new callbacks, setView to the same view and navigate to the same date do not emit', () => {
    const cal = createCalendar({ defaultEvents: [lunch], defaultDate: new Date(2026, 9, 14), now })
    const before = cal.getState()
    const listener = vi.fn()
    cal.subscribe(listener)
    cal.setOptions({ onEventCreate: () => {} })
    cal.setView('week')
    cal.navigate(new Date(2026, 9, 14))
    expect(cal.getState()).toBe(before)
    expect(listener).not.toHaveBeenCalled()
  })
})
