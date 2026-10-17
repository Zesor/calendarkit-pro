import { addDays, addMonths, addWeeks, format, startOfDay, subDays, subMonths, subWeeks } from 'date-fns'
import type { CalendarEvent, ViewType } from '../types'
import { applyChange, deletionFor, duplicateEvent, masterOf } from './changes'
import { computeDayMove, computeDayResize, computeDrop } from './dnd'
import { shiftSeries, stripOccurrenceFields } from './recurrence'
import { expansionRange } from './changes'
import { normalizeEvents } from './events'
import { type ParsedToken, parseEventSentence, type SentenceLanguage } from './nlp'
import { type DateRange, expandRecurrences } from './recurrence'
import { warnOnce } from './warn'

export interface CalendarCallbacks {
  onEventCreate?: (event: Partial<CalendarEvent>) => void
  onEventUpdate?: (event: CalendarEvent) => void
  onEventDelete?: (eventId: string) => void
  onEventDrop?: (event: CalendarEvent, start: Date, end: Date) => void
  onEventResize?: (event: CalendarEvent, start: Date, end: Date) => void
  onOccurrenceDelete?: (occurrence: CalendarEvent, updatedSeries: CalendarEvent) => void
  onViewChange?: (view: ViewType) => void
  onDateChange?: (date: Date) => void
  /** Called with the full event list after every change (both modes). */
  onEventsChange?: (events: CalendarEvent[]) => void
}

export interface CalendarOptions extends CalendarCallbacks {
  /** Controlled events: the consumer owns the list and updates it from the callbacks. */
  events?: CalendarEvent[]
  /** Uncontrolled events: the store keeps the list and reports it through `onEventsChange`. */
  defaultEvents?: CalendarEvent[]
  view?: ViewType
  defaultView?: ViewType
  date?: Date
  defaultDate?: Date
  timezone?: string
  readOnly?: boolean
  /** Language of the sentences typed in a draft title ("demain 13h", "tomorrow 1pm"). Default 'en'. */
  language?: SentenceLanguage
  /** Clock, injectable for tests. */
  now?: () => Date
  /** Id factory for created and duplicated events. */
  createId?: () => string
}

export interface Draft {
  /** The title as typed, sentence words included. */
  title: string
  start: Date
  end: Date
  allDay: boolean
  resourceId?: string
  calendarId?: string
  recurrence?: CalendarEvent['recurrence']
  /** Words recognised in the title, for display. */
  tokens: ParsedToken[]
  dirty: boolean
}

export type Dialog =
  | { kind: 'event'; eventId: string }
  | { kind: 'quick'; draft: Draft }
  | { kind: 'editor'; draft: Draft; eventId?: string }
  | { kind: 'more'; eventIds: string[] }

export type ChangeKind = 'create' | 'update' | 'move' | 'resize' | 'delete' | 'duplicate'

export interface LastChange {
  kind: ChangeKind
  eventId: string
  title: string
}

export interface CalendarState {
  view: ViewType
  date: Date
  timezone?: string
  readOnly: boolean
  /** Normalized source events (masters, not occurrences). */
  events: CalendarEvent[]
  /** Events with recurring series expanded over `range`. */
  occurrences: CalendarEvent[]
  /** `occurrences` without the hidden calendars: what views render. */
  visible: CalendarEvent[]
  range: DateRange
  hiddenCalendars: readonly string[]
  dialog: Dialog | null
  lastChange: LastChange | null
}

export interface MoveTarget {
  date: Date
  resourceId?: string
  allDayRow?: boolean
  grabOffsetMs?: number
  grabDayOffset?: number
}

export interface CalendarStore {
  getState(): CalendarState
  subscribe(listener: () => void): () => void
  setOptions(options: Partial<CalendarOptions>): void
  navigate(to: 'prev' | 'next' | 'today' | Date): void
  setView(view: ViewType): void
  openEvent(eventId: string): void
  openSlot(start: Date, options?: { end?: Date; allDay?: boolean; resourceId?: string; editor?: boolean }): void
  openEditor(eventId?: string): void
  openMore(eventIds: string[]): void
  updateDraft(patch: Partial<Pick<Draft, 'title' | 'start' | 'end' | 'allDay' | 'resourceId' | 'calendarId' | 'recurrence'>>): void
  closeDialog(): void
  toggleCalendar(calendarId: string): void
  saveDraft(): void
  create(event: Partial<CalendarEvent> & Pick<CalendarEvent, 'title' | 'start' | 'end'>): void
  update(event: CalendarEvent): void
  move(eventId: string, target: MoveTarget): void
  resize(eventId: string, end: Date): void
  resizeDays(eventId: string, lastDay: Date): void
  remove(eventId: string): void
  duplicate(eventId: string): void
  undo(): void
}

const HOUR = 60 * 60 * 1000

/** Shifts a date like the views' "previous/next" buttons do. */
function step(view: ViewType, date: Date, dir: 1 | -1): Date {
  switch (view) {
    case 'month': return dir > 0 ? addMonths(date, 1) : subMonths(date, 1)
    case 'week': return dir > 0 ? addWeeks(date, 1) : subWeeks(date, 1)
    case 'agenda': return addDays(date, 7 * dir)
    default: return dir > 0 ? addDays(date, 1) : subDays(date, 1)
  }
}

/**
 * Framework-agnostic calendar state: view, date, events (controlled or not), dialogs, and the
 * actions that change them. Snapshots are immutable and stable between changes, so React can
 * read them with `useSyncExternalStore`.
 */
export function createCalendar(initial: CalendarOptions = {}): CalendarStore {
  let options: CalendarOptions = { ...initial }
  let ownEvents = initial.defaultEvents ?? []
  let ownView: ViewType = initial.defaultView ?? 'week'
  let ownDate: Date = initial.defaultDate ?? (initial.now ?? (() => new Date()))()
  let dialog: Dialog | null = null
  let hidden: readonly string[] = []
  let lastChange: LastChange | null = null
  let undoEntry: { prev: CalendarEvent[]; inverse: () => void } | null = null
  let snapshot: CalendarState | null = null
  const listeners = new Set<() => void>()
  const memo: { normalized?: CalendarEvent[]; rangeKey?: string; range?: DateRange; tz?: string; occurrences?: CalendarEvent[] } = {}

  const now = () => (options.now ?? (() => new Date()))()
  const source = () => options.events ?? ownEvents

  function compute(): CalendarState {
    const view = options.view ?? ownView
    const date = options.date ?? ownDate
    const normalized = normalizeEvents(source())
    // Occurrences are recomputed only when the events, the zone or the focused month change (R4).
    const rangeKey = format(date, 'yyyy-MM')
    if (memo.rangeKey !== rangeKey) {
      memo.rangeKey = rangeKey
      memo.range = expansionRange(new Date(date.getFullYear(), date.getMonth(), 1))
      memo.occurrences = undefined
    }
    if (memo.occurrences === undefined || memo.normalized !== normalized || memo.tz !== options.timezone) {
      memo.normalized = normalized
      memo.tz = options.timezone
      memo.occurrences = expandRecurrences(normalized, memo.range!, options.timezone)
    }
    const occurrences = memo.occurrences!
    const visible = hidden.length === 0 ? occurrences : occurrences.filter((e) => !e.calendarId || !hidden.includes(e.calendarId))
    return { view, date, timezone: options.timezone, readOnly: !!options.readOnly, events: normalized, occurrences, visible, range: memo.range!, hiddenCalendars: hidden, dialog, lastChange }
  }

  function emit() {
    snapshot = compute()
    listeners.forEach((listener) => listener())
  }

  const find = (eventId: string) => {
    const state = store.getState()
    return state.occurrences.find((e) => e.id === eventId) ?? state.events.find((e) => e.id === eventId)
  }

  function makeDraft(start: Date, end: Date, extra: Partial<Draft> = {}): Draft {
    return { title: '', start, end, allDay: false, tokens: [], dirty: false, ...extra }
  }

  function draftFrom(event: CalendarEvent): Draft {
    return makeDraft(event.start, event.end, { title: event.title, allDay: !!event.allDay, resourceId: event.resourceId, calendarId: event.calendarId, recurrence: event.recurrence })
  }

  const controlledEvents = () => options.events !== undefined

  function commit(kind: ChangeKind, next: CalendarEvent[], subject: CalendarEvent, notify: () => void, inverse: () => void) {
    const prev = source()
    if (!controlledEvents()) ownEvents = next
    notify()
    options.onEventsChange?.(next)
    undoEntry = { prev, inverse }
    lastChange = { kind, eventId: subject.id, title: subject.title }
    dialog = null
    emit()
  }

  const replace = (list: CalendarEvent[], event: CalendarEvent) => list.map((e) => (e.id === event.id ? event : e))
  const without = (list: CalendarEvent[], id: string) => list.filter((e) => e.id !== id)

  function applyDates(event: CalendarEvent, start: Date, end: Date, kind: 'move' | 'resize', resourceId?: string) {
    const state = store.getState()
    const change = applyChange(event, start, end, state.events, options.timezone)
    if (!change) return
    const updated = resourceId !== undefined ? { ...change.updated, resourceId } : change.updated
    const original = change.original
    commit(kind, replace(source(), updated), updated, () => {
      if (kind === 'move') options.onEventDrop?.(original, updated.start, updated.end)
      else options.onEventResize?.(original, updated.start, updated.end)
      options.onEventUpdate?.(updated)
    }, () => options.onEventUpdate?.(original))
  }

  const store: CalendarStore = {
    getState: () => (snapshot ??= compute()),
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    setOptions(patch) {
      options = { ...options, ...patch }
      emit()
    },
    navigate(to) {
      const state = store.getState()
      const date = to === 'today' ? now() : to instanceof Date ? to : step(state.view, state.date, to === 'next' ? 1 : -1)
      if (options.date === undefined) ownDate = date
      options.onDateChange?.(date)
      emit()
    },
    setView(view) {
      if (options.view === undefined) ownView = view
      options.onViewChange?.(view)
      emit()
    },
    openEvent(eventId) {
      if (!find(eventId)) return warnOnce(`missing-event:${eventId}`, `openEvent: no event with id "${eventId}".`)
      dialog = { kind: 'event', eventId }
      emit()
    },
    openSlot(start, { end, allDay = false, resourceId, editor = false } = {}) {
      if (options.readOnly) return
      const from = allDay ? startOfDay(start) : start
      const to = end ?? (allDay ? addDays(from, 1) : new Date(from.getTime() + HOUR))
      const draft = makeDraft(from, to, { allDay, resourceId })
      dialog = editor ? { kind: 'editor', draft } : { kind: 'quick', draft }
      emit()
    },
    openEditor(eventId) {
      if (options.readOnly) return
      if (eventId === undefined) {
        const draft = dialog && dialog.kind === 'quick' ? dialog.draft : makeDraft(now(), new Date(now().getTime() + HOUR))
        dialog = { kind: 'editor', draft }
      } else {
        const event = find(eventId)
        if (!event) return warnOnce(`missing-event:${eventId}`, `openEditor: no event with id "${eventId}".`)
        dialog = { kind: 'editor', draft: draftFrom(event), eventId }
      }
      emit()
    },
    openMore(eventIds) {
      dialog = { kind: 'more', eventIds }
      emit()
    },
    updateDraft(patch) {
      if (!dialog || (dialog.kind !== 'quick' && dialog.kind !== 'editor')) return
      let draft: Draft = { ...dialog.draft, ...patch, dirty: true }
      if (patch.title !== undefined) {
        const parsed = parseEventSentence(patch.title, { now: now(), language: options.language ?? 'en' })
        const length = draft.end.getTime() - draft.start.getTime()
        let start = draft.start
        if (parsed.date) start = new Date(parsed.date.getFullYear(), parsed.date.getMonth(), parsed.date.getDate(), start.getHours(), start.getMinutes())
        if (parsed.startMinutes !== undefined && !draft.allDay) start = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, parsed.startMinutes)
        const end = new Date(start.getTime() + (parsed.durationMinutes !== undefined ? parsed.durationMinutes * 60000 : length))
        draft = { ...draft, start, end, tokens: parsed.tokens, recurrence: parsed.recurrence ?? draft.recurrence }
      }
      dialog = { ...dialog, draft }
      emit()
    },
    closeDialog() {
      dialog = null
      emit()
    },
    toggleCalendar(calendarId) {
      hidden = hidden.includes(calendarId) ? hidden.filter((id) => id !== calendarId) : [...hidden, calendarId]
      emit()
    },
    saveDraft() {
      if (options.readOnly || !dialog || (dialog.kind !== 'quick' && dialog.kind !== 'editor')) return
      const { draft } = dialog
      const parsed = parseEventSentence(draft.title, { now: now(), language: options.language ?? 'en' })
      const title = (parsed.title || draft.title).trim() || 'Untitled'
      const fields = { title, start: draft.start, end: draft.end, allDay: draft.allDay || undefined, resourceId: draft.resourceId, calendarId: draft.calendarId, recurrence: draft.recurrence }
      const eventId = dialog.kind === 'editor' ? dialog.eventId : undefined
      if (eventId === undefined) return store.create(fields)
      const event = find(eventId)
      if (!event) return
      if (event.originalEventId) {
        // R5: editing one occurrence updates the series, shifted by the same delta.
        const master = masterOf(event, store.getState().events)
        if (!master) return
        const edited = { ...master, ...stripOccurrenceFields({ ...event, ...fields } as CalendarEvent), id: master.id, start: master.start, end: master.end }
        return store.update(shiftSeries(edited, event, fields.start, fields.end, edited.allDay ? undefined : options.timezone))
      }
      store.update({ ...event, ...fields })
    },
    create(fields) {
      if (options.readOnly) return
      const event = { ...fields, id: fields.id ?? (options.createId ?? (() => `evt-${now().getTime()}-${Math.random().toString(36).slice(2, 7)}`))() } as CalendarEvent
      commit('create', [...source(), event], event, () => options.onEventCreate?.(event), () => options.onEventDelete?.(event.id))
    },
    update(event) {
      if (options.readOnly) return
      const before = source().find((e) => e.id === event.id)
      if (!before) return warnOnce(`missing-event:${event.id}`, `update: no event with id "${event.id}".`)
      commit('update', replace(source(), event), event, () => options.onEventUpdate?.(event), () => options.onEventUpdate?.(before))
    },
    move(eventId, target) {
      if (options.readOnly) return
      const event = find(eventId)
      if (!event) return
      if (target.grabDayOffset !== undefined) {
        const move = computeDayMove(event, target.date, target.grabDayOffset, options.timezone)
        if (move) applyDates(event, move.start, move.end, 'move')
        return
      }
      const view = target.allDayRow ? 'month' : store.getState().view
      const drop = computeDrop({ event, overDate: target.date, overResourceId: target.resourceId, grabOffsetMs: target.grabOffsetMs, view, tz: options.timezone })
      if (drop) applyDates(event, drop.start, drop.end, 'move', drop.resourceId)
    },
    resize(eventId, end) {
      if (options.readOnly) return
      const event = find(eventId)
      if (event && end.getTime() > event.start.getTime() && end.getTime() !== event.end.getTime()) applyDates(event, event.start, end, 'resize')
    },
    resizeDays(eventId, lastDay) {
      if (options.readOnly) return
      const event = find(eventId)
      const end = event && computeDayResize(event, lastDay, options.timezone)
      if (event && end) applyDates(event, event.start, end, 'resize')
    },
    remove(eventId) {
      if (options.readOnly) return
      const event = find(eventId)
      if (!event) return
      const state = store.getState()
      const deletion = deletionFor(event, state.events, !!options.onOccurrenceDelete || !controlledEvents())
      if (deletion.kind === 'occurrence') {
        const master = masterOf(event, state.events)!
        commit('delete', replace(source(), deletion.series), event, () => options.onOccurrenceDelete?.(deletion.occurrence, deletion.series), () => options.onEventUpdate?.(master))
      } else {
        const removed = source().find((e) => e.id === deletion.id) ?? event
        commit('delete', without(source(), deletion.id), removed, () => options.onEventDelete?.(deletion.id), () => options.onEventCreate?.(removed))
      }
    },
    duplicate(eventId) {
      if (options.readOnly) return
      const event = find(eventId)
      if (!event) return
      const copy = duplicateEvent(event, (options.createId ?? (() => `${event.originalEventId ?? event.id}-copy-${now().getTime()}`))())
      commit('duplicate', [...source(), copy], copy, () => options.onEventCreate?.(copy), () => options.onEventDelete?.(copy.id))
    },
    undo() {
      if (!undoEntry) return
      const { prev, inverse } = undoEntry
      undoEntry = null
      if (!controlledEvents()) ownEvents = prev
      inverse()
      options.onEventsChange?.(prev)
      lastChange = null
      emit()
    },
  }
  return store
}
