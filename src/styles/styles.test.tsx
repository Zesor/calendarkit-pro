// The Scheduler brings its own stylesheet: every class it renders is a `ck:` class the compiled CSS
// defines (no host Tailwind, no collision with the host's classes).
import { cleanup } from '@testing-library/react'
import postcss from 'postcss'
import { afterEach, describe, expect, test } from 'vitest'
import { classLists, SCHEDULER_STATES } from '../test/states'
import { css } from './css.generated'

afterEach(cleanup)

// Markers read by group-*/peer-* variants, and the scope of the reset and the tokens.
const MARKERS = new Set(['ck-root', 'ck:group', 'ck:peer'])
const selectorOf = (name: string) => '.' + name.replace(/[^\w-]/g, (c) => `\\${c}`)

describe('compiled stylesheet', () => {
  test.each(SCHEDULER_STATES)('%s: every class is a ck: class of the compiled stylesheet', (_label, show) => {
    show()
    const names = new Set(classLists().flatMap((list) => list.split(/\s+/)))
    const unstyled = [...names].filter((n) => !MARKERS.has(n) && !(n.startsWith('ck:') && css.includes(selectorOf(n))))
    expect(unstyled.sort()).toEqual([])
  })

  test('is unlayered and never reaches outside the calendar', () => {
    const root = postcss.parse(css)
    const layers: string[] = []
    root.walkAtRules('layer', (rule) => void layers.push(rule.params))
    // `properties` only declares fallbacks of Tailwind's internal --tw-* variables.
    expect(layers).toEqual(['properties'])
    const outside: string[] = []
    const within = (node: postcss.Node, name: string): boolean =>
      !!node.parent && ((node.parent.type === 'atrule' && (node.parent as postcss.AtRule).name === name) || within(node.parent, name))
    root.walkRules((rule) => {
      if (within(rule, 'layer') || within(rule, 'keyframes')) return
      for (const selector of rule.selectors) {
        if (selector === ':root' || selector === ':host') continue // the --ck-* theme scale
        if (!/^(:where\()?\.(ck\\:|ck-root|dark\b)/.test(selector)) outside.push(selector)
      }
    })
    expect(outside).toEqual([])
    expect(css).toContain('--ck-styles:1')
  })
})
