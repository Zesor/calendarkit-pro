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

  test('ck:dark: follows the mode of the calendar root, not any .dark ancestor', () => {
    // Every rule of one dark-mode class, with the media query it sits in (if any).
    const rules: Array<{ selector: string; media: string }> = []
    postcss.parse(css).walkRules((rule) => {
      if (!rule.selector.startsWith('.ck\\:dark\\:text-amber-400')) return
      const parent = rule.parent as postcss.AtRule
      rules.push({ selector: rule.selector, media: parent.type === 'atrule' ? parent.params : '' })
    })
    document.body.innerHTML = `
      <div class="dark"><main><div class="ck-root" data-ck-mode="light"><div><span id="light-in-dark"></span></div></div></main></div>
      <div class="dark"><main><div class="ck-root"><span id="no-mode-in-dark"></span></div></main></div>
      <div class="ck-root" data-ck-mode="dark"><span id="dark"></span></div>
      <div class="ck-root" data-ck-mode="system"><span id="system"></span></div>
      <div class="ck-root"><span id="no-mode"></span></div>`
    const activeIn = (id: string) => {
      const el = document.getElementById(id)!
      el.className = 'ck:dark:text-amber-400'
      return rules.filter((r) => el.matches(r.selector)).map((r) => r.media || 'always')
    }
    expect(activeIn('light-in-dark')).toEqual([])
    expect(activeIn('no-mode')).toEqual([])
    expect(activeIn('no-mode-in-dark')).toEqual(['always'])
    expect(activeIn('dark')).toEqual(['always'])
    expect(activeIn('system')).toEqual(['(prefers-color-scheme:dark)'])
    document.body.innerHTML = ''
  })
})
