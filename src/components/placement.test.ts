// Dialogs open beside what they belong to (spec §8.1, §8.5): right of it, else left of it,
// top-aligned with it, and always inside the area they may use.
import { describe, expect, test } from 'vitest'
import { placeBeside } from './placement'

const area = { left: 0, top: 0, right: 1000, bottom: 700 }
const box = { width: 320, height: 200 }

describe('placeBeside', () => {
  test('to the right of the anchor, top-aligned with it', () => {
    expect(placeBeside({ left: 100, top: 150, right: 200, bottom: 250 }, box, area)).toEqual({ left: 212, top: 150 })
  })

  test('to the left when there is no room on the right', () => {
    expect(placeBeside({ left: 700, top: 150, right: 800, bottom: 250 }, box, area)).toEqual({ left: 368, top: 150 })
  })

  test('inside the area when there is room on neither side, and never below its bottom', () => {
    expect(placeBeside({ left: 20, top: 600, right: 980, bottom: 680 }, box, area)).toEqual({ left: 8, top: 492 })
  })

  test('relative to an area that does not start at 0', () => {
    expect(placeBeside({ left: 150, top: 200, right: 250, bottom: 260 }, box, { left: 50, top: 100, right: 1050, bottom: 800 })).toEqual({ left: 212, top: 100 })
  })

  test('a box taller than the area starts at its top', () => {
    expect(placeBeside({ left: 100, top: 300, right: 200, bottom: 320 }, { width: 320, height: 900 }, area).top).toBe(8)
  })
})
