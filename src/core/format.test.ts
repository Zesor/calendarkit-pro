import { describe, expect, test } from 'vitest'
import { enUS, fr } from 'date-fns/locale'
import { getDateTimeFormat, resolveTranslations, timeFormats, timeZoneAbbreviation, uses24HourClock } from './format'

describe('format', () => {
  test('uses24HourClock', () => {
    expect(uses24HourClock()).toBe(false)
    expect(uses24HourClock(enUS)).toBe(false)
    expect(uses24HourClock(fr)).toBe(true)
  })

  test('C5: timeFormats returns the same object for the same clock convention', () => {
    expect(timeFormats(fr)).toEqual({ hour: 'H:mm', time: 'H:mm', compact: 'H:mm' })
    expect(timeFormats(enUS)).toEqual({ hour: 'h a', time: 'h:mm a', compact: 'h:mm' })
    expect(timeFormats(fr)).toBe(timeFormats(fr))
  })

  test('C4: getDateTimeFormat reuses the instance for the same key', () => {
    const a = getDateTimeFormat('en-US', 'Europe/Paris', { timeZoneName: 'short' })
    const b = getDateTimeFormat('en-US', 'Europe/Paris', { timeZoneName: 'short' })
    expect(a).toBe(b)
    expect(getDateTimeFormat('en-US', 'Asia/Tokyo', { timeZoneName: 'short' })).not.toBe(a)
  })

  test('C4: the formatter cache is bounded to 50 entries (LRU)', () => {
    const first = getDateTimeFormat('en-US', 'UTC', { hour: 'numeric' })
    // 50 other keys: 2 locales × 25 fixed-offset zones (Etc/GMT-12 … Etc/GMT+12)
    for (const locale of ['de-DE', 'fr-FR']) {
      for (let offset = -12; offset <= 12; offset++) {
        const zone = offset === 0 ? 'Etc/GMT' : `Etc/GMT${offset > 0 ? '+' : ''}${offset}`
        getDateTimeFormat(locale, zone, { hour: 'numeric' })
      }
    }
    expect(getDateTimeFormat('en-US', 'UTC', { hour: 'numeric' })).not.toBe(first)
  })

  test('timeZoneAbbreviation', () => {
    expect(timeZoneAbbreviation(new Date('2026-01-15T12:00:00Z'), 'UTC')).toBe('UTC')
    expect(timeZoneAbbreviation(new Date(), 'Mars/Olympus')).toBe('')
  })

  test('resolveTranslations merges overrides over the language pack', () => {
    expect(resolveTranslations('fr').today).toBe("Aujourd'hui")
    expect(resolveTranslations(undefined, { today: 'Now' }).today).toBe('Now')
  })
})
