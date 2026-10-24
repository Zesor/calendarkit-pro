// The three themes, light and dark: readable everywhere (WCAG AA), selected by the theme and mode props.
import { cleanup, render } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import postcss from 'postcss'
import React from 'react'
import { afterEach, describe, expect, test } from 'vitest'
import { eventColors } from '../core/eventColors'
import { Scheduler } from '../index'

afterEach(cleanup)

type Tokens = Record<string, string>
// Tokens of each theme and mode, read from the source stylesheet (the media-query copies for
// mode="system" are the same values as the dark rules).
function themeTokens(): Record<string, Tokens> {
  const out: Record<string, Tokens> = {}
  postcss.parse(readFileSync('src/styles/themes.css', 'utf8')).walkRules((rule) => {
    if (rule.parent?.type !== 'root') return
    const theme = /data-ck-theme="(\w+)"/.exec(rule.selector)?.[1] ?? 'calm'
    const mode = rule.selector.includes('data-ck-mode="dark"') ? 'dark' : 'light'
    const tokens: Tokens = (out[`${theme} ${mode}`] ??= {})
    rule.walkDecls(/^--ck-/, (decl) => void (tokens[decl.prop.slice(5)] = decl.value))
  })
  return out
}

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const mixHex = (a: string, b: string, share: number) =>
  '#' + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * share + parseInt(b.slice(i, i + 2), 16) * (1 - share)).toString(16).padStart(2, '0')).join('')

const TEXT_PAIRS = [
  ['foreground', 'background'],
  ['foreground', 'muted'],
  ['foreground', 'accent'],
  ['muted-foreground', 'background'],
  ['muted-foreground', 'muted'],
  ['primary-foreground', 'primary'],
  ['destructive-foreground', 'destructive'],
  ['destructive', 'background'],
  ['warning', 'background'],
]

describe('themes', () => {
  const themes = themeTokens()

  test('calm, vivid and editorial each define light and dark', () => {
    expect(Object.keys(themes).sort()).toEqual(['calm dark', 'calm light', 'editorial dark', 'editorial light', 'vivid dark', 'vivid light'])
  })

  test.each(Object.keys(themeTokens()))('%s: text pairs reach 4.5:1, the focus ring 3:1', (name) => {
    const t = themes[name]
    const failing = TEXT_PAIRS.filter(([fg, bg]) => contrast(t[fg], t[bg]) < 4.5).map(([fg, bg]) => `${fg} on ${bg}: ${contrast(t[fg], t[bg]).toFixed(2)}`)
    if (contrast(t.ring, t.background) < 3) failing.push(`ring on background: ${contrast(t.ring, t.background).toFixed(2)}`)
    // Danger menu items and reminder chips: the colour as text on its own 10 % tint.
    for (const token of ['destructive', 'warning']) {
      const tint = mixHex(t[token], t.background, 0.1)
      if (contrast(t[token], tint) < 4.5) failing.push(`${token} on its tint: ${contrast(t[token], tint).toFixed(2)}`)
    }
    expect(failing).toEqual([])
  })

  test('text on a primary fill uses the primary foreground (white on #f2f2f4 in calm dark is unreadable)', () => {
    const { container } = render(<Scheduler view="day" date={new Date()} calendars={[{ id: 'w', label: 'Work' }]} mode="dark" />)
    const check = container.querySelector('input[aria-label="Work"]')!.parentElement!.querySelector('svg')!
    expect(check.getAttribute('class')).toContain('ck:text-primary-foreground')
    const now = container.querySelector('span.ck\\:bg-primary')!
    expect(now.className).toContain('ck:text-primary-foreground')
  })

  test("each theme's colour for events without one is a readable event colour (eventColors of --ck-event)", () => {
    for (const theme of ['calm', 'vivid', 'editorial']) {
      const t = themes[`${theme} light`]
      expect({ theme, ...eventColors(t.event) }).toEqual({ theme, solid: t.event, inkLight: t['event-ink-light'], inkDark: t['event-ink-dark'] })
    }
  })

  test('the Scheduler root carries the preset and the mode', () => {
    const { container, rerender } = render(<Scheduler view="month" />)
    const root = () => container.querySelector('.ck-root')!
    expect(root().getAttribute('data-ck-theme')).toBe('calm')
    expect(root().hasAttribute('data-ck-mode')).toBe(false)
    rerender(<Scheduler view="month" theme="vivid" mode="system" />)
    expect(root().getAttribute('data-ck-theme')).toBe('vivid')
    expect(root().getAttribute('data-ck-mode')).toBe('system')
    rerender(<Scheduler view="month" theme={{ preset: 'editorial', colors: { primary: '#0b7285' } }} isDarkMode />)
    expect(root().getAttribute('data-ck-theme')).toBe('editorial')
    expect(root().getAttribute('data-ck-mode')).toBe('dark')
    expect((root() as HTMLElement).style.getPropertyValue('--ck-primary')).toBe('#0b7285')
  })
})
