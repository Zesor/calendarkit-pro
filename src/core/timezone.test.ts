import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  displayDayKey, displayToday, fromDisplay, isSameDisplayDay,
  minutesSinceDisplayMidnight, resolveTimeZone, toDisplay,
} from './timezone'
import { resetWarnings } from './warn'

afterEach(() => resetWarnings())

describe('timezone', () => {
  test('toDisplay / fromDisplay round-trip in another zone', () => {
    const instant = new Date('2026-10-17T23:30:00Z')
    const wall = toDisplay(instant, 'Asia/Tokyo')
    expect([wall.getDate(), wall.getHours(), wall.getMinutes()]).toEqual([18, 8, 30])
    expect(fromDisplay(wall, 'Asia/Tokyo').toISOString()).toBe(instant.toISOString())
  })

  test('without a zone, display is local time', () => {
    const instant = new Date(2026, 9, 17, 9, 15)
    expect(toDisplay(instant)).toEqual(instant)
    expect(minutesSinceDisplayMidnight(instant)).toBe(9 * 60 + 15)
  })

  test('T1: an event at 23:30 UTC belongs to the next day in Tokyo', () => {
    const instant = new Date('2026-10-17T23:30:00Z')
    expect(displayDayKey(instant, 'Asia/Tokyo')).toBe('2026-10-18')
    expect(isSameDisplayDay(instant, new Date(2026, 9, 18), 'Asia/Tokyo')).toBe(true)
  })

  test('T2: today is computed in the display zone', () => {
    const now = new Date('2026-10-17T21:30:00Z') // 23:30 Paris, 06:30 next day Tokyo
    expect(displayToday('Asia/Tokyo', now)).toEqual(new Date(2026, 9, 18))
    expect(displayToday(undefined, now)).toEqual(new Date(2026, 9, 17))
  })

  test('an invalid zone falls back to local time and warns once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(resolveTimeZone('Mars/Olympus')).toBeUndefined()
    resolveTimeZone('Mars/Olympus')
    expect(warn).toHaveBeenCalledTimes(1)
    const instant = new Date(2026, 9, 17, 9, 0)
    expect(toDisplay(instant, 'Mars/Olympus')).toEqual(instant)
  })
})
