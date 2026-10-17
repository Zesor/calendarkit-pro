import { eachDayOfInterval, endOfMonth, endOfWeek, Locale, startOfMonth, startOfWeek } from 'date-fns'

export type WeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** Week start from the date-fns locale, or `fallback` when the locale has none. */
export function resolveWeekStartsOn(locale: Locale | undefined, fallback: WeekStartsOn): WeekStartsOn {
  return locale?.options?.weekStartsOn ?? fallback
}

export function getWeekDays(date: Date, weekStartsOn: WeekStartsOn): Date[] {
  return eachDayOfInterval({
    start: startOfWeek(date, { weekStartsOn }),
    end: endOfWeek(date, { weekStartsOn }),
  })
}

export function getMonthGrid(date: Date, weekStartsOn: WeekStartsOn): Date[] {
  const monthStart = startOfMonth(date)
  return eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn }),
    end: endOfWeek(endOfMonth(monthStart), { weekStartsOn }),
  })
}
