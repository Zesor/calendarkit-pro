// Spec §4 dependency regime: the CSS is compiled at build time, icons, class joining, animations,
// drag modifiers and time zones are internal. What remains is the date math, recurrence and drag-and-drop.
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))

describe('package', () => {
  test('runtime dependencies are date-fns, rrule and dnd-kit only', () => {
    expect(Object.keys(pkg.dependencies).sort()).toEqual(['@dnd-kit/core', '@dnd-kit/utilities', 'date-fns', 'rrule'])
  })

  test('publishes the stylesheet and keeps it from being tree-shaken', () => {
    expect(pkg.exports['./styles.css']).toBe('./dist/styles.css')
    expect(pkg.sideEffects).toEqual(['*.css'])
  })
})
