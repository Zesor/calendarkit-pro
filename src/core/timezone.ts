import { format, isSameDay, startOfDay } from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'
import { warnOnce } from './warn'

const validity = new Map<string, boolean>()

/** Returns `tz` when it is a valid IANA zone, otherwise `undefined` (local time) with a warning. */
export function resolveTimeZone(tz?: string): string | undefined {
  if (!tz) return undefined
  let valid = validity.get(tz)
  if (valid === undefined) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: tz })
      valid = true
    } catch {
      valid = false
    }
    validity.set(tz, valid)
  }
  if (!valid) {
    warnOnce(`invalid-timezone:${tz}`, `Unknown timezone "${tz}", falling back to local time.`)
    return undefined
  }
  return tz
}

/**
 * Converts an instant to its wall-clock representation in `tz`: a local Date whose
 * getHours()/getDate()… read as the clock in that zone. Identity without a zone.
 */
export function toDisplay(date: Date, tz?: string): Date {
  const zone = resolveTimeZone(tz)
  return zone ? toZonedTime(date, zone) : date
}

/** Inverse of `toDisplay`: interprets a wall-clock Date in `tz` and returns the real instant. */
export function fromDisplay(wall: Date, tz?: string): Date {
  const zone = resolveTimeZone(tz)
  return zone ? fromZonedTime(wall, zone) : new Date(wall)
}

export function minutesSinceDisplayMidnight(date: Date, tz?: string): number {
  const wall = toDisplay(date, tz)
  return wall.getHours() * 60 + wall.getMinutes()
}

/** `yyyy-MM-dd` key of the display day an instant falls on. */
export function displayDayKey(date: Date, tz?: string): string {
  return format(toDisplay(date, tz), 'yyyy-MM-dd')
}

/** Whether an instant falls on `day`, a wall-clock date as rendered by the grids. */
export function isSameDisplayDay(date: Date, day: Date, tz?: string): boolean {
  return isSameDay(toDisplay(date, tz), day)
}

/** Today's date (wall clock, at midnight) in the display zone. */
export function displayToday(tz?: string, now: Date = new Date()): Date {
  return startOfDay(toDisplay(now, tz))
}
