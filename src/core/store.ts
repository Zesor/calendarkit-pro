import { addDays, addMonths, addWeeks, format, startOfDay, subDays, subMonths, subWeeks } from 'date-fns'
import type { CalendarEvent, ViewType } from '../types'
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
  const ownEvents = initial.defaultEvents ?? []
  let ownView: ViewType = initial.defaultView ?? 'week'
  let ownDate: Date = initial.defaultDate ?? (initial.now ?? (() => new Date()))()
  let dialog: Dialog | null = null
  let hidden: readonly string[] = []
  const lastChange: LastChange | null = null
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
  }
  return store
}
