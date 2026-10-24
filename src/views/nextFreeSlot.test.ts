// "Create" opens the quick card where a click would (spec §8.5): the next free hour from now,
// inside the grid's hours.
import { describe, expect, test } from 'vitest'
import { nextFreeSlot } from './nextFreeSlot'

const at = (h: number, m = 0, day = 15) => new Date(2026, 9, day, h, m)
const busy = (h1: number, m1: number, h2: number, m2: number) => ({ start: at(h1, m1), end: at(h2, m2) })

describe('nextFreeSlot', () => {
  test('the next half hour from now', () => {
    expect(nextFreeSlot(at(10, 7), [], 0, 24)).toEqual(at(10, 30))
    expect(nextFreeSlot(at(10, 0), [], 0, 24)).toEqual(at(10, 0))
  })

  test('after the events it would overlap', () => {
    expect(nextFreeSlot(at(10, 7), [busy(10, 30, 11, 30), busy(11, 30, 12, 0)], 0, 24)).toEqual(at(12, 0))
  })

  test('inside the grid hours: before them it starts at the first hour, after them tomorrow', () => {
    expect(nextFreeSlot(at(6, 10), [], 8, 18)).toEqual(at(8, 0))
    expect(nextFreeSlot(at(18, 20), [], 8, 18)).toEqual(at(8, 0, 16))
    expect(nextFreeSlot(at(17, 10), [], 8, 18)).toEqual(at(8, 0, 16))
  })

  test('a day busy until the grid ends: the first half hour anyway', () => {
    expect(nextFreeSlot(at(16, 5), [busy(16, 0, 18, 0)], 8, 18)).toEqual(at(16, 30))
  })
})
