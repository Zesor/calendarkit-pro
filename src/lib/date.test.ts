import { describe, expect, test } from 'vitest'
import { enUS, fr } from 'date-fns/locale'
import { getMonthGrid, uses24HourClock } from './date'

describe('getMonthGrid', () => {
  test('October 2026, Monday start: Mon 28 Sep → Sun 1 Nov (35 days)', () => {
    const grid = getMonthGrid(new Date(2026, 9, 15), 1)
    expect(grid).toHaveLength(35)
    expect(grid[0]).toEqual(new Date(2026, 8, 28))
    expect(grid[34]).toEqual(new Date(2026, 10, 1))
  })

  test('October 2026, default Sunday start: Sun 27 Sep → Sat 31 Oct', () => {
    const grid = getMonthGrid(new Date(2026, 9, 15))
    expect(grid).toHaveLength(35)
    expect(grid[0]).toEqual(new Date(2026, 8, 27))
    expect(grid[34]).toEqual(new Date(2026, 9, 31))
  })
})

describe('uses24HourClock', () => {
  test('is false without a locale', () => {
    expect(uses24HourClock()).toBe(false)
  })
  test('is false for en-US', () => {
    expect(uses24HourClock(enUS)).toBe(false)
  })
  test('is true for fr', () => {
    expect(uses24HourClock(fr)).toBe(true)
  })
})
