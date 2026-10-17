import { addDays, format, startOfDay } from 'date-fns'
import type { CalendarEvent, Resource } from '../../types'
import { isDayEvent } from '../allDay'
import type { CalendarState } from '../store'
import { toDisplay } from '../timezone'
import { memoByEvents } from './memo'

export interface AgendaGroup {
  day: Date
  key: string
  events: CalendarEvent[]
}

export type FlowItem =
  | { kind: 'event'; event: CalendarEvent; start: Date; end: Date }
  | { kind: 'free'; start: Date; end: Date }
  | { kind: 'now'; at: Date }

export interface FlowDayModel {
  day: Date
  /** All-day and 24 h+ events covering the day. */
  allDay: CalendarEvent[]
  /** Timed events, free slots and the current time, in order. */
  items: FlowItem[]
}

export interface ResourceRow {
  resource: Resource
  events: CalendarEvent[]
}

const agendaCache = new WeakMap<CalendarEvent[], Map<string, AgendaGroup[]>>()
const flowCache = new WeakMap<CalendarEvent[], Map<string, FlowDayModel>>()
const resourceCache = new WeakMap<CalendarEvent[], Map<string, WeakMap<Resource[], ResourceRow[]>>>()
const byStart = (a: CalendarEvent, b: CalendarEvent) => a.start.getTime() - b.start.getTime()

/** Events starting in the next `days` days from the state's date, grouped by display day. */
export function selectAgenda(state: CalendarState, options: { days?: number } = {}): AgendaGroup[] {
  const length = options.days ?? 30
  const from = startOfDay(toDisplay(state.date, state.timezone))
  return memoByEvents(agendaCache, state.visible, `${state.timezone ?? ''}|${from.getTime()}|${length}`, () => {
    const to = addDays(from, length)
    const groups = new Map<string, AgendaGroup>()
    for (const event of [...state.visible].sort(byStart)) {
      const wall = toDisplay(event.start, state.timezone)
      if (wall < from || wall >= to) continue
      const day = startOfDay(wall)
      const key = format(day, 'yyyy-MM-dd')
      const group = groups.get(key) ?? { day, key, events: [] }
      group.events.push(event)
      groups.set(key, group)
    }
    return [...groups.values()]
  })
}

/**
 * One day as a chronological feed (Flow layout): timed events, free slots of at least
 * `minFreeMinutes` between `fromHour` and `toHour`, and the current time when the day is today.
 */
export function selectFlowDay(state: CalendarState, options: { day: Date; fromHour?: number; toHour?: number; minFreeMinutes?: number; now?: Date }): FlowDayModel {
  const { day, fromHour = 8, toHour = 20, minFreeMinutes = 60 } = options
  const now = options.now ?? new Date()
  const dayStart = startOfDay(day)
  return memoByEvents(flowCache, state.visible, `${state.timezone ?? ''}|${dayStart.getTime()}|${fromHour}|${toHour}|${minFreeMinutes}|${Math.floor(now.getTime() / 60000)}`, () => {
    const tz = state.timezone
    const dayEnd = addDays(dayStart, 1)
    const wall = (e: CalendarEvent) => ({ start: toDisplay(e.start, tz), end: toDisplay(e.end, tz) })
    const covering = state.visible.filter((e) => { const w = wall(e); return w.start < dayEnd && w.end > dayStart })
    const allDay = covering.filter((e) => isDayEvent(e)).sort(byStart)
    const timed = covering.filter((e) => !isDayEvent(e)).map((e) => ({ event: e, ...wall(e) })).sort((a, b) => a.start.getTime() - b.start.getTime())
    const items: FlowItem[] = []
    // Wall-clock hours, so a DST day still opens at `fromHour`.
    let cursor = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate(), fromHour)
    const close = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate(), toHour)
    const minFree = minFreeMinutes * 60000
    const free = (until: Date) => {
      const end = until > close ? close : until
      if (end.getTime() - cursor.getTime() >= minFree) items.push({ kind: 'free', start: cursor, end })
    }
    for (const t of timed) {
      free(t.start)
      items.push({ kind: 'event', event: t.event, start: t.start, end: t.end })
      if (t.end > cursor) cursor = t.end
    }
    free(close)
    // The current time goes before the first item starting after it (after a running event),
    // splitting the free slot it falls in.
    const wallNow = toDisplay(now, tz)
    if (wallNow >= dayStart && wallNow < dayEnd) {
      const index = items.findIndex((i) => (i.kind === 'free' ? i.end > wallNow : i.kind === 'event' && i.start > wallNow))
      const at = index < 0 ? items.length : index
      const slot = items[at]
      if (slot && slot.kind === 'free' && slot.start < wallNow) {
        const parts: FlowItem[] = []
        if (wallNow.getTime() - slot.start.getTime() >= minFree) parts.push({ kind: 'free', start: slot.start, end: wallNow })
        parts.push({ kind: 'now', at: wallNow })
        if (slot.end.getTime() - wallNow.getTime() >= minFree) parts.push({ kind: 'free', start: wallNow, end: slot.end })
        items.splice(at, 1, ...parts)
      } else {
        items.splice(at, 0, { kind: 'now', at: wallNow })
      }
    }
    return { day: dayStart, allDay, items }
  })
}

/** Rows of the resource view: each resource with its events overlapping the state's day. */
export function selectResources(state: CalendarState, resources: Resource[]): ResourceRow[] {
  const dayStart = startOfDay(toDisplay(state.date, state.timezone))
  const byResources = memoByEvents(resourceCache, state.visible, `${state.timezone ?? ''}|${dayStart.getTime()}`, () => new WeakMap<Resource[], ResourceRow[]>())
  const cached = byResources.get(resources)
  if (cached) return cached
  const dayEnd = addDays(dayStart, 1)
  const rows = resources.map((resource) => ({
      resource,
      events: state.visible
        .filter((e) => e.resourceId === resource.id && toDisplay(e.start, state.timezone) < dayEnd && toDisplay(e.end, state.timezone) > dayStart)
        .sort(byStart),
    }))
  byResources.set(resources, rows)
  return rows
}
