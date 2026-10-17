import { addDays, format, startOfDay } from 'date-fns'
import type { CalendarEvent, Resource } from '../../types'
import { isDayEvent } from '../allDay'
import type { CalendarState } from '../store'
import { toDisplay } from '../timezone'
import { memoByState } from './memo'

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

const agendaCache = new WeakMap<CalendarState, Map<string, AgendaGroup[]>>()
const flowCache = new WeakMap<CalendarState, Map<string, FlowDayModel>>()
const resourceCache = new WeakMap<CalendarState, Map<string, ResourceRow[]>>()
const byStart = (a: CalendarEvent, b: CalendarEvent) => a.start.getTime() - b.start.getTime()

/** Events starting in the next `days` days from the state's date, grouped by display day. */
export function selectAgenda(state: CalendarState, options: { days?: number } = {}): AgendaGroup[] {
  const length = options.days ?? 30
  const from = startOfDay(toDisplay(state.date, state.timezone))
  return memoByState(agendaCache, state, `${from.getTime()}|${length}`, () => {
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
  return memoByState(flowCache, state, `${dayStart.getTime()}|${fromHour}|${toHour}|${minFreeMinutes}|${Math.floor(now.getTime() / 60000)}`, () => {
    const tz = state.timezone
    const dayEnd = addDays(dayStart, 1)
    const wall = (e: CalendarEvent) => ({ start: toDisplay(e.start, tz), end: toDisplay(e.end, tz) })
    const covering = state.visible.filter((e) => { const w = wall(e); return w.start < dayEnd && w.end > dayStart })
    const allDay = covering.filter((e) => isDayEvent(e)).sort(byStart)
    const timed = covering.filter((e) => !isDayEvent(e)).map((e) => ({ event: e, ...wall(e) })).sort((a, b) => a.start.getTime() - b.start.getTime())
    const items: FlowItem[] = []
    let cursor = new Date(dayStart.getTime() + fromHour * 3600000)
    const close = new Date(dayStart.getTime() + toHour * 3600000)
    const wallNow = toDisplay(now, tz)
    let nowShown = !(wallNow >= dayStart && wallNow < dayEnd)
    const free = (until: Date) => {
      if (until.getTime() - cursor.getTime() >= minFreeMinutes * 60000) items.push({ kind: 'free', start: cursor, end: until })
    }
    for (const t of timed) {
      free(t.start)
      if (!nowShown && wallNow < t.start) { items.push({ kind: 'now', at: wallNow }); nowShown = true }
      items.push({ kind: 'event', event: t.event, start: t.start, end: t.end })
      if (t.end > cursor) cursor = t.end
    }
    if (!nowShown && wallNow >= cursor) { items.push({ kind: 'now', at: wallNow }); nowShown = true }
    free(close)
    return { day: dayStart, allDay, items }
  })
}

/** Rows of the resource view: each resource with its events overlapping the state's day. */
export function selectResources(state: CalendarState, resources: Resource[]): ResourceRow[] {
  const dayStart = startOfDay(toDisplay(state.date, state.timezone))
  return memoByState(resourceCache, state, `${dayStart.getTime()}|${resources.map((r) => r.id).join(',')}`, () => {
    const dayEnd = addDays(dayStart, 1)
    return resources.map((resource) => ({
      resource,
      events: state.visible
        .filter((e) => e.resourceId === resource.id && toDisplay(e.start, state.timezone) < dayEnd && toDisplay(e.end, state.timezone) > dayStart)
        .sort(byStart),
    }))
  })
}
