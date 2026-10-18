import { format, isSameDay, startOfDay } from 'date-fns'
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

const DAY_MS = 86_400_000
const formatters = new Map<string, Intl.DateTimeFormat>()

/** Wall clock of `date` in `zone`, as UTC milliseconds (seconds precision). */
function wallClockMs(date: Date, zone: string): number {
  let formatter = formatters.get(zone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    })
    formatters.set(zone, formatter)
  }
  const p: Record<string, number> = {}
  for (const { type, value } of formatter.formatToParts(date)) if (type !== 'literal') p[type] = Number(value)
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
}

/** UTC offset of `zone` at the instant `ms`, in milliseconds. */
const offsetAt = (ms: number, zone: string) => wallClockMs(new Date(ms), zone) - Math.floor(ms / 1000) * 1000

/**
 * Converts an instant to its wall-clock representation in `tz`: a local Date whose
 * getHours()/getDate()… read as the clock in that zone. Identity without a zone.
 */
export function toDisplay(date: Date, tz?: string): Date {
  const zone = resolveTimeZone(tz)
  if (!zone) return date
  const wall = new Date(date.getTime() + offsetAt(date.getTime(), zone))
  return new Date(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate(), wall.getUTCHours(), wall.getUTCMinutes(), wall.getUTCSeconds(), wall.getUTCMilliseconds())
}

/** Inverse of `toDisplay`: interprets a wall-clock Date in `tz` and returns the real instant. */
export function fromDisplay(wall: Date, tz?: string): Date {
  const zone = resolveTimeZone(tz)
  if (!zone) return new Date(wall)
  const asUtc = Date.UTC(wall.getFullYear(), wall.getMonth(), wall.getDate(), wall.getHours(), wall.getMinutes(), wall.getSeconds(), wall.getMilliseconds())
  // The zone's offsets a day before and after (one DST switch at most in between). A wall clock seen
  // twice (clocks set back) is the earlier instant; one skipped (clocks set forward) moves forward by
  // the gap, like `new Date(…)` and Temporal's "compatible" rule.
  const before = offsetAt(asUtc - DAY_MS, zone)
  const after = offsetAt(asUtc + DAY_MS, zone)
  for (const offset of [Math.max(before, after), Math.min(before, after)]) {
    if (offsetAt(asUtc - offset, zone) === offset) return new Date(asUtc - offset)
  }
  return new Date(asUtc - before)
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
