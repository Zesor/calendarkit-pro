import { describe, expect, test } from 'vitest'
import type { CalendarEvent } from '../types'
import { applyChange, deletionFor, duplicateEvent, expansionRange } from './changes'
import { expandRecurrences } from './recurrence'

const single: CalendarEvent = { id: 'one', title: 'One-off', start: new Date(2026, 9, 14, 9), end: new Date(2026, 9, 14, 10) }
const weekly: CalendarEvent = { id: 'w', title: 'Weekly', start: new Date(2026, 9, 5, 9), end: new Date(2026, 9, 5, 10), recurrence: { freq: 'WEEKLY' } }
const occurrenceOf = (master: CalendarEvent, day: number) =>
  expandRecurrences([master], { start: new Date(2026, 9, 1), end: new Date(2026, 9, 31) }).find((e) => e.start.getDate() === day)!

describe('expansionRange', () => {
  test('covers the focused month ± one month, plus 37 days', () => {
    expect(expansionRange(new Date(2026, 9, 1))).toEqual({ start: new Date(2026, 7, 30), end: new Date(2027, 0, 6, 23, 59, 59, 999) })
  })
})

describe('applyChange', () => {
  test('a single event gets the new dates', () => {
    const start = new Date(2026, 9, 15, 9), end = new Date(2026, 9, 15, 10)
    expect(applyChange(single, start, end, [single])).toEqual({ original: single, updated: { ...single, start, end } })
  })

  test('an occurrence moves its whole series and returns the master as original', () => {
    const occ = occurrenceOf(weekly, 12)
    const change = applyChange(occ, new Date(2026, 9, 13, 9), new Date(2026, 9, 13, 10), [weekly])!
    expect(change.original).toBe(weekly)
    expect(change.updated).toMatchObject({ id: 'w', start: new Date(2026, 9, 6, 9), end: new Date(2026, 9, 6, 10) })
    expect(change.updated.originalEventId).toBeUndefined()
  })

  test('null when the master no longer exists', () => {
    expect(applyChange(occurrenceOf(weekly, 12), new Date(), new Date(), [])).toBeNull()
  })
})

describe('duplicateEvent', () => {
  test('a single event one day later, "(Copy)", no recurrence fields', () => {
    expect(duplicateEvent(occurrenceOf(weekly, 12), 'c1')).toEqual({
      id: 'c1', title: 'Weekly (Copy)', start: new Date(2026, 9, 13, 9), end: new Date(2026, 9, 13, 10),
    })
  })

  test('an all-day event on the DST day moves by one calendar day', () => {
    const holiday: CalendarEvent = { id: 'h', title: 'Holiday', start: new Date(2026, 9, 25), end: new Date(2026, 9, 26), allDay: true }
    expect(duplicateEvent(holiday, 'c2')).toMatchObject({ start: new Date(2026, 9, 26), end: new Date(2026, 9, 27), allDay: true })
  })
})

describe('deletionFor', () => {
  test('a single event is deleted by id', () => {
    expect(deletionFor(single, [single], true)).toEqual({ kind: 'event', id: 'one' })
  })

  test('an occurrence removes only its date when the consumer handles occurrence deletes', () => {
    const occ = occurrenceOf(weekly, 12)
    const d = deletionFor(occ, [weekly], true)
    expect(d.kind).toBe('occurrence')
    expect(d.kind === 'occurrence' && d.series.recurrence?.exdates).toEqual([new Date(2026, 9, 12, 9)])
  })

  test('otherwise (or without the master) the whole series is deleted', () => {
    expect(deletionFor(occurrenceOf(weekly, 12), [weekly], false)).toEqual({ kind: 'event', id: 'w' })
    expect(deletionFor(occurrenceOf(weekly, 12), [], true)).toEqual({ kind: 'event', id: 'w' })
  })
})
