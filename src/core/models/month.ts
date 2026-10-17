import { format, isSameMonth, startOfDay } from 'date-fns'
import type { CalendarEvent } from '../../types'
import { type DayRowLayout, layoutDayRow, partitionDayEvents } from '../allDay'
import { eventsByStartDay } from '../events'
import type { CalendarState } from '../store'
import { toDisplay } from '../timezone'
import { getMonthGrid, type WeekStartsOn } from '../week'
import { memoByState } from './memo'

export interface MonthCell {
  day: Date
  key: string
  inMonth: boolean
  isToday: boolean
  /** Timed events starting that day, by start time. */
  timed: CalendarEvent[]
}

export interface MonthWeek {
  days: Date[]
  /** Continuous bars for all-day and multi-day events across the week. */
  bars: DayRowLayout
  cells: MonthCell[]
}

export interface MonthModel {
  weeks: MonthWeek[]
}

const cache = new WeakMap<CalendarState, Map<string, MonthModel>>()

/** The month grid as plain data: week rows with their bars, and each day's timed events. */
export function selectMonth(state: CalendarState, options: { weekStartsOn?: WeekStartsOn; now?: Date } = {}): MonthModel {
  const weekStartsOn = options.weekStartsOn ?? 1
  const now = options.now ?? new Date()
  const key = `${weekStartsOn}|${format(now, 'yyyy-MM-dd')}`
  return memoByState(cache, state, key, () => {
    const tz = state.timezone
    const focus = toDisplay(state.date, tz)
    const days = getMonthGrid(focus, weekStartsOn)
    const { dayEvents, timedEvents } = partitionDayEvents(state.visible, tz)
    const byDay = eventsByStartDay(timedEvents, tz)
    const today = startOfDay(toDisplay(now, tz)).getTime()
    const weeks: MonthWeek[] = []
    for (let i = 0; i < days.length; i += 7) {
      const week = days.slice(i, i + 7)
      weeks.push({
        days: week,
        bars: layoutDayRow(week, dayEvents, tz),
        cells: week.map((day) => {
          const dayKey = format(day, 'yyyy-MM-dd')
          return { day, key: dayKey, inMonth: isSameMonth(day, focus), isToday: day.getTime() === today, timed: [...(byDay.get(dayKey) ?? [])].sort((a, b) => a.start.getTime() - b.start.getTime()) }
        }),
      })
    }
    return { weeks }
  })
}
