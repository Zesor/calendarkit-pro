import { describe, expect, test } from 'vitest'
import { enUS, fr } from 'date-fns/locale'
import { getMonthGrid, getWeekDays, resolveWeekStartsOn } from './week'

describe('week', () => {
  test('resolveWeekStartsOn reads the locale, else the fallback', () => {
    expect(resolveWeekStartsOn(fr, 0)).toBe(1)
    expect(resolveWeekStartsOn(enUS, 1)).toBe(0)
    expect(resolveWeekStartsOn(undefined, 1)).toBe(1)
  })

  test('getWeekDays returns 7 days starting on weekStartsOn', () => {
    const days = getWeekDays(new Date(2026, 9, 15), 1)
    expect(days).toHaveLength(7)
    expect(days[0]).toEqual(new Date(2026, 9, 12))
    expect(days[6]).toEqual(new Date(2026, 9, 18))
  })

  test('getMonthGrid: October 2026, Monday start → Mon 28 Sep … Sun 1 Nov', () => {
    const grid = getMonthGrid(new Date(2026, 9, 15), 1)
    expect(grid).toHaveLength(35)
    expect(grid[0]).toEqual(new Date(2026, 8, 28))
    expect(grid[34]).toEqual(new Date(2026, 10, 1))
  })

  test('getMonthGrid: October 2026, Sunday start → Sun 27 Sep … Sat 31 Oct', () => {
    const grid = getMonthGrid(new Date(2026, 9, 15), 0)
    expect(grid[0]).toEqual(new Date(2026, 8, 27))
    expect(grid[34]).toEqual(new Date(2026, 9, 31))
  })
})
