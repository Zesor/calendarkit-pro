import { format, Locale } from 'date-fns'
import { en, fr } from '../locales'
import type { CalendarTranslations } from '../types'

const clockCache = new WeakMap<Locale, boolean>()

/** Whether the locale renders times on a 24-hour clock (fr, de, pt-BR…). False without a locale. */
export function uses24HourClock(locale?: Locale): boolean {
  if (!locale) return false
  let is24 = clockCache.get(locale)
  if (is24 === undefined) {
    is24 = !/[ap]\.?m/i.test(format(new Date(2000, 0, 1, 13, 0), 'p', { locale }))
    clockCache.set(locale, is24)
  }
  return is24
}

export interface TimeFormats {
  /** Hour labels on the time axis ("9 AM" / "9:00"). */
  hour: string
  /** Event times ("9:30 AM" / "9:30"). */
  time: string
  /** Compact time without meridiem ("9:30"). */
  compact: string
}

const H24: TimeFormats = { hour: 'H:mm', time: 'H:mm', compact: 'H:mm' }
const H12: TimeFormats = { hour: 'h a', time: 'h:mm a', compact: 'h:mm' }

export function timeFormats(locale?: Locale): TimeFormats {
  return uses24HourClock(locale) ? H24 : H12
}

const MAX_FORMATTERS = 50
const formatters = new Map<string, Intl.DateTimeFormat>()

/** Cached `Intl.DateTimeFormat` (LRU, 50 entries): constructing formatters is expensive. */
export function getDateTimeFormat(
  locale: string,
  timeZone: string | undefined,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `${locale}|${timeZone ?? ''}|${JSON.stringify(options)}`
  let formatter = formatters.get(key)
  if (formatter) {
    formatters.delete(key)
  } else {
    formatter = new Intl.DateTimeFormat(locale, { ...options, timeZone })
    if (formatters.size >= MAX_FORMATTERS) {
      formatters.delete(formatters.keys().next().value as string)
    }
  }
  formatters.set(key, formatter)
  return formatter
}

/** Short zone name such as "CET" or "GMT+9"; empty string if the zone is unknown. */
export function timeZoneAbbreviation(date: Date, timeZone?: string): string {
  try {
    return getDateTimeFormat('en-US', timeZone, { timeZoneName: 'short' })
      .formatToParts(date)
      .find((part) => part.type === 'timeZoneName')?.value ?? ''
  } catch {
    return ''
  }
}

/** Built-in language pack merged with the consumer's overrides. */
export function resolveTranslations(
  language?: 'en' | 'fr',
  overrides?: Partial<CalendarTranslations>,
): CalendarTranslations {
  const defined = Object.fromEntries(Object.entries(overrides ?? {}).filter(([, value]) => value !== undefined))
  return { ...(language === 'fr' ? fr : en), ...defined }
}

/** Replaces `{name}` placeholders: interpolate('{n} minutes before', { n: 5 }) → '5 minutes before'. */
export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match))
}
