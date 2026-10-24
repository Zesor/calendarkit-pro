import { describe, expect, test, vi } from 'vitest'
import type { CalendarEvent } from '../types'
import { createCalendar } from './store'

const now = () => new Date(2026, 9, 14, 11, 52)
const ids = () => { let n = 0; return () => `new-${++n}` }
const standup: CalendarEvent = { id: 'su', title: 'Standup', start: new Date(2026, 9, 5, 9), end: new Date(2026, 9, 5, 9, 30), recurrence: { freq: 'WEEKLY' } }
const lunch: CalendarEvent = { id: 'lu', title: 'Lunch', start: new Date(2026, 9, 14, 12, 30), end: new Date(2026, 9, 14, 13, 30) }
const conf: CalendarEvent = { id: 'cf', title: 'Conference', start: new Date(2026, 9, 12), end: new Date(2026, 9, 15), allDay: true }
const occurrence = (cal: ReturnType<typeof createCalendar>, day: number) => cal.getState().occurrences.find((e) => e.originalEventId === 'su' && e.start.getDate() === day)!

describe('uncontrolled mode (defaultEvents + onEventsChange)', () => {
  test('saveDraft creates the event with the cleaned title and reports the new list', () => {
    const onEventsChange = vi.fn()
    const onEventCreate = vi.fn()
    const cal = createCalendar({ defaultEvents: [lunch], onEventsChange, onEventCreate, language: 'fr', createId: ids(), now })
    cal.openSlot(new Date(2026, 9, 14, 15))
    cal.updateDraft({ title: 'Sport demain 18h' })
    cal.saveDraft()
    const created = { id: 'new-1', title: 'Sport', start: new Date(2026, 9, 15, 18), end: new Date(2026, 9, 15, 19) }
    expect(onEventCreate).toHaveBeenCalledWith(expect.objectContaining(created))
    expect(onEventsChange).toHaveBeenLastCalledWith([lunch, expect.objectContaining(created)])
    expect(cal.getState().events.map((e) => e.id)).toEqual(['lu', 'new-1'])
    expect(cal.getState().dialog).toBeNull()
    expect(cal.getState().lastChange).toEqual({ kind: 'create', eventId: 'new-1', title: 'Sport' })
  })

  test('undo restores the previous list and clears lastChange', () => {
    const onEventsChange = vi.fn()
    const cal = createCalendar({ defaultEvents: [lunch], onEventsChange, now })
    cal.remove('lu')
    expect(cal.getState().events).toEqual([])
    cal.undo()
    expect(cal.getState().events).toEqual([lunch])
    expect(onEventsChange).toHaveBeenLastCalledWith([lunch])
    expect(cal.getState().lastChange).toBeNull()
    cal.undo() // nothing left to undo
    expect(onEventsChange).toHaveBeenCalledTimes(2)
  })

  test('deleting an occurrence excludes only its date (the store owns the list)', () => {
    const cal = createCalendar({ defaultEvents: [standup], now })
    cal.remove(occurrence(cal, 12).id)
    expect(cal.getState().events[0].recurrence?.exdates).toEqual([new Date(2026, 9, 12, 9)])
    expect(occurrence(cal, 12)).toBeUndefined()
    expect(occurrence(cal, 19)).toBeDefined()
  })
})

describe('controlled mode: 1.x callbacks', () => {
  test('move: onEventDrop with the event before the move, then onEventUpdate, then onEventsChange', () => {
    const calls: string[] = []
    const cal = createCalendar({
      events: [lunch], now,
      onEventDrop: (e, start) => calls.push(`drop ${e.id} ${start.getDate()}@${start.getHours()}`),
      onEventUpdate: (e) => calls.push(`update ${e.id} ${e.start.getDate()}@${e.start.getHours()}`),
      onEventsChange: (list) => calls.push(`list ${list.length}`),
    })
    cal.move('lu', { date: new Date(2026, 9, 16, 14) })
    expect(calls).toEqual(['drop lu 16@14', 'update lu 16@14', 'list 1'])
    // Controlled: the store does not keep the change, the consumer does.
    expect(cal.getState().events[0].start).toEqual(lunch.start)
  })

  test('moving an occurrence shifts the series and passes the master as the original event', () => {
    const onEventDrop = vi.fn()
    const onEventUpdate = vi.fn()
    const cal = createCalendar({ events: [standup], onEventDrop, onEventUpdate, now })
    cal.move(occurrence(cal, 12).id, { date: new Date(2026, 9, 13, 9) })
    expect(onEventDrop.mock.calls[0][0]).toBe(standup)
    expect(onEventUpdate.mock.calls[0][0]).toMatchObject({ id: 'su', start: new Date(2026, 9, 6, 9) })
  })

  test('all-day bars move by days and stretch to an exclusive end', () => {
    const onEventUpdate = vi.fn()
    const onEventResize = vi.fn()
    const cal = createCalendar({ events: [conf], onEventUpdate, onEventResize, now })
    cal.move('cf', { date: new Date(2026, 9, 16), grabDayOffset: 2 })
    expect(onEventUpdate.mock.calls[0][0]).toMatchObject({ start: new Date(2026, 9, 14), end: new Date(2026, 9, 17) })
    cal.resizeDays('cf', new Date(2026, 9, 16))
    expect(onEventResize).toHaveBeenCalledWith(conf, new Date(2026, 9, 12), new Date(2026, 9, 17))
  })

  test('resize ignores an end before the start or unchanged; a drop on the all-day row keeps the time', () => {
    const onEventUpdate = vi.fn()
    const cal = createCalendar({ events: [lunch], onEventUpdate, now })
    cal.resize('lu', new Date(2026, 9, 14, 12))
    cal.resize('lu', lunch.end)
    expect(onEventUpdate).not.toHaveBeenCalled()
    cal.resize('lu', new Date(2026, 9, 14, 14))
    expect(onEventUpdate.mock.calls[0][0].end).toEqual(new Date(2026, 9, 14, 14))
    cal.move('lu', { date: new Date(2026, 9, 17), allDayRow: true })
    expect(onEventUpdate.mock.calls[1][0]).toMatchObject({ start: new Date(2026, 9, 17, 12, 30) })
  })

  test('remove: occurrence via onOccurrenceDelete when given, else the series; undo emits the inverse callback', () => {
    const onOccurrenceDelete = vi.fn()
    const onEventDelete = vi.fn()
    const onEventCreate = vi.fn()
    const cal = createCalendar({ events: [standup, lunch], onOccurrenceDelete, onEventDelete, onEventCreate, now })
    cal.remove(occurrence(cal, 12).id)
    expect(onOccurrenceDelete.mock.calls[0][1].recurrence.exdates).toEqual([new Date(2026, 9, 12, 9)])
    cal.remove('lu')
    expect(onEventDelete).toHaveBeenCalledWith('lu')
    cal.undo()
    expect(onEventCreate).toHaveBeenCalledWith(lunch)
    const noHandler = createCalendar({ events: [standup], onEventDelete, now })
    noHandler.remove(occurrence(noHandler, 12).id)
    expect(onEventDelete).toHaveBeenLastCalledWith('su')
  })

  test('duplicate creates a single event one day later; editing an occurrence shifts its series', () => {
    const onEventCreate = vi.fn()
    const onEventUpdate = vi.fn()
    const cal = createCalendar({ events: [standup], onEventCreate, onEventUpdate, createId: ids(), now })
    cal.duplicate(occurrence(cal, 12).id)
    expect(onEventCreate.mock.calls[0][0]).toMatchObject({ id: 'new-1', title: 'Standup (Copy)', start: new Date(2026, 9, 13, 9) })
    cal.openEditor(occurrence(cal, 12).id)
    cal.updateDraft({ start: new Date(2026, 9, 12, 10), end: new Date(2026, 9, 12, 10, 30) })
    cal.saveDraft()
    expect(onEventUpdate.mock.calls[0][0]).toMatchObject({ id: 'su', start: new Date(2026, 9, 5, 10) })
  })

  test('readOnly blocks every mutation', () => {
    const onEventsChange = vi.fn()
    const cal = createCalendar({ events: [lunch], readOnly: true, onEventsChange, now })
    cal.move('lu', { date: new Date(2026, 9, 16, 14) })
    cal.resize('lu', new Date(2026, 9, 14, 15))
    cal.remove('lu')
    cal.duplicate('lu')
    cal.create({ title: 'x', start: lunch.start, end: lunch.end })
    expect(onEventsChange).not.toHaveBeenCalled()
  })
})

describe('review fixes: drafts, undo, occurrences', () => {
  test('I4: editing an event whose title contains a time word keeps its title', () => {
    const onEventUpdate = vi.fn()
    const call: CalendarEvent = { id: 'c', title: 'Call 3pm sync', start: new Date(2026, 9, 14, 15), end: new Date(2026, 9, 14, 16) }
    const cal = createCalendar({ events: [call], onEventUpdate, now })
    cal.openEditor('c')
    cal.updateDraft({ calendarId: 'work' })
    cal.saveDraft()
    expect(onEventUpdate.mock.calls[0][0]).toMatchObject({ title: 'Call 3pm sync', calendarId: 'work', start: call.start })
  })

  test('I5: drafts are in the display timezone (Tokyo calendar, Paris browser)', () => {
    const onEventCreate = vi.fn()
    const flight: CalendarEvent = { id: 'f', title: 'Flight', start: new Date('2026-10-14T23:30:00Z'), end: new Date('2026-10-15T00:30:00Z') }
    const cal = createCalendar({ events: [flight], timezone: 'Asia/Tokyo', onEventCreate, createId: ids(), now })
    cal.openEditor('f')
    const d = cal.getState().dialog
    expect(d?.kind === 'editor' && d.draft.start).toEqual(new Date(2026, 9, 15, 8, 30)) // 08:30 Tokyo wall clock
    cal.openSlot(new Date(2026, 9, 15, 9)) // the 09:00 slot of the Tokyo grid
    cal.saveDraft()
    expect(onEventCreate.mock.calls[0][0].start).toEqual(new Date('2026-10-15T00:00:00Z'))
  })

  test('I6: undo reverts only the last change, keeping events added since', () => {
    const onEventsChange = vi.fn()
    const extra: CalendarEvent = { id: 'x', title: 'Pushed by the server', start: new Date(2026, 9, 16, 9), end: new Date(2026, 9, 16, 10) }
    const cal = createCalendar({ events: [lunch], onEventsChange, createId: ids(), now })
    cal.create({ title: 'New', start: new Date(2026, 9, 15, 9), end: new Date(2026, 9, 15, 10) })
    cal.setOptions({ events: [...onEventsChange.mock.calls[0][0], extra] })
    cal.undo()
    expect(onEventsChange.mock.calls.at(-1)![0].map((e: CalendarEvent) => e.id)).toEqual(['lu', 'x'])
  })

  test('I7: a controlled consumer using only onEventsChange can delete one occurrence', () => {
    const onEventsChange = vi.fn()
    const cal = createCalendar({ events: [standup], onEventsChange, now })
    cal.remove(occurrence(cal, 12).id)
    const next = onEventsChange.mock.calls[0][0] as CalendarEvent[]
    expect(next).toHaveLength(1)
    expect(next[0].recurrence?.exdates).toEqual([new Date(2026, 9, 12, 9)])
  })
})

describe('saveEvent (custom forms, 1.x modal)', () => {
  test('saves the edited event with every form field, merged into the stored one', () => {
    const onEventUpdate = vi.fn()
    const cal = createCalendar({ events: [lunch], onEventUpdate, now })
    cal.openEvent('lu')
    cal.saveEvent({ title: 'Team lunch', description: 'Bring the slides', color: '#047857' })
    expect(onEventUpdate).toHaveBeenCalledWith({ ...lunch, title: 'Team lunch', description: 'Bring the slides', color: '#047857' })
    expect(cal.getState().dialog).toBeNull()
  })

  test('saving an occurrence shifts its series', () => {
    const onEventUpdate = vi.fn()
    const cal = createCalendar({ events: [standup], onEventUpdate, now })
    cal.openEditor(occurrence(cal, 12).id)
    cal.saveEvent({ start: new Date(2026, 9, 12, 10), end: new Date(2026, 9, 12, 10, 30), description: 'moved' })
    expect(onEventUpdate.mock.calls[0][0]).toMatchObject({ id: 'su', start: new Date(2026, 9, 5, 10), description: 'moved' })
  })

  test('without an edited event it creates one, keeping the resource of the clicked slot', () => {
    const onEventCreate = vi.fn()
    const cal = createCalendar({ events: [], onEventCreate, createId: ids(), now })
    cal.openSlot(new Date(2026, 9, 15, 14), { resourceId: 'room-b', editor: true })
    cal.saveEvent({ title: 'Demo', start: new Date(2026, 9, 15, 14), end: new Date(2026, 9, 15, 15) })
    expect(onEventCreate).toHaveBeenCalledWith({ id: 'new-1', title: 'Demo', start: new Date(2026, 9, 15, 14), end: new Date(2026, 9, 15, 15), resourceId: 'room-b' })
  })

  test('readOnly ignores it', () => {
    const onEventCreate = vi.fn()
    createCalendar({ events: [], onEventCreate, readOnly: true, now }).saveEvent({ title: 'x', start: lunch.start, end: lunch.end })
    expect(onEventCreate).not.toHaveBeenCalled()
  })
})
