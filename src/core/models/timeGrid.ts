import { addDays, format, startOfDay } from 'date-fns'
import type { CalendarEvent } from '../../types'
import { type DayRowLayout, layoutDayRow, partitionDayEvents } from '../allDay'
import { segmentsByDisplayDay } from '../events'
import { layoutColumns } from '../overlap'
import type { CalendarState } from '../store'
import { minutesSinceDisplayMidnight, toDisplay } from '../timezone'
import { getWeekDays, type WeekStartsOn } from '../week'
import { memoByState } from './memo'

/** A positioned event in a day column. `top` and `height` are minutes since the day's midnight. */
export interface TimeBlock {
  event: CalendarEvent
  start: Date
  end: Date
  top: number
  height: number
  column: number
  span: number
  columns: number
  continuesBefore: boolean
  continuesAfter: boolean
}

/** Events of one overlap cluster that did not fit, shown as "+N". */
export interface TimeMore {
  events: CalendarEvent[]
  top: number
  height: number
  column: number
  columns: number
}

export interface TimeColumn {
  day: Date
  key: string
  blocks: TimeBlock[]
  more: TimeMore[]
}

export interface TimeGridModel {
  days: Date[]
  columns: TimeColumn[]
  /** Bars of the all-day row (all-day events and timed events of 24 h or more). */
  allDay: DayRowLayout
  /** The current-time line, when today is visible. */
  now: { column: number; minutes: number } | null
}

/** Wall-clock days shown by the week or day view for the state's date. */
export function visibleDays(state: CalendarState, weekStartsOn: WeekStartsOn = 1): Date[] {
  const wall = toDisplay(state.date, state.timezone)
  return state.view === 'day' || state.view === 'resource' ? [startOfDay(wall)] : getWeekDays(wall, weekStartsOn)
}

const cache = new WeakMap<CalendarState, Map<string, TimeGridModel>>()
const minutesOf = (wall: Date, day: Date) => (wall.getTime() - day.getTime()) / 60000

/**
 * The week / day grid as plain data: per day column, positioned blocks (overlaps laid out by
 * `layoutColumns`, extra events grouped into "+N"), the all-day row and the current-time line.
 */
export function selectTimeGrid(state: CalendarState, options: { days?: Date[]; maxColumns?: number; now?: Date; weekStartsOn?: WeekStartsOn } = {}): TimeGridModel {
  const days = options.days ?? visibleDays(state, options.weekStartsOn)
  const maxColumns = options.maxColumns ?? Infinity
  const now = options.now ?? new Date()
  const key = `${days[0].getTime()}|${days.length}|${maxColumns}|${Math.floor(now.getTime() / 60000)}`
  return memoByState(cache, state, key, () => {
    const tz = state.timezone
    const { dayEvents, timedEvents } = partitionDayEvents(state.visible, tz)
    const range = { start: days[0], end: addDays(days[days.length - 1], 1) }
    const byDay = segmentsByDisplayDay(timedEvents, tz, range)
    const columns = days.map((day) => {
      const dayKey = format(day, 'yyyy-MM-dd')
      const { blocks, more } = layoutColumns(byDay.get(dayKey) ?? [], maxColumns)
      const next = addDays(day, 1)
      return {
        day,
        key: dayKey,
        blocks: blocks.map((b) => ({
          event: b.event,
          start: b.start,
          end: b.end,
          top: minutesOf(b.start, day),
          height: Math.max(minutesOf(b.end, day) - minutesOf(b.start, day), 0),
          column: b.column,
          span: b.span,
          columns: b.columns,
          continuesBefore: toDisplay(b.event.start, tz) < day,
          continuesAfter: toDisplay(b.event.end, tz) > next,
        })),
        more: more.map((m) => ({ events: m.segments.map((s) => s.event), top: minutesOf(m.start, day), height: minutesOf(m.end, day) - minutesOf(m.start, day), column: m.column, columns: m.columns })),
      }
    })
    const today = startOfDay(toDisplay(now, tz)).getTime()
    const todayIndex = days.findIndex((d) => d.getTime() === today)
    return {
      days,
      columns,
      allDay: layoutDayRow(days, dayEvents, tz),
      now: todayIndex >= 0 ? { column: todayIndex, minutes: minutesSinceDisplayMidnight(now, tz) } : null,
    }
  })
}
