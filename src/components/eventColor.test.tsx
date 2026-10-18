// Events are drawn in their colour, else their calendar's, else their resource's, else the theme's,
// with the readable solid and inks of src/core/eventColors.ts.
import { cleanup, render, screen } from '@testing-library/react'
import postcss from 'postcss'
import React from 'react'
import { afterEach, describe, expect, test } from 'vitest'
import { eventColors } from '../core/eventColors'
import { Scheduler } from '../index'
import { css } from '../styles/css.generated'
import { eventColorStyle, resolveEventColor } from './eventColor'

afterEach(cleanup)

const varsOf = (el: Element) => (el as HTMLElement).style.getPropertyValue('--ck-ev')

describe('event colours in the UI', () => {
  test('a hex or rgb() colour gives its readable solid and inks; other safe colours fill only; unsafe or none give nothing', () => {
    const c = eventColors('#ffff00')!
    expect(eventColorStyle('#ffff00')).toEqual({ '--ck-ev': c.solid, '--ck-ev-ink-l': c.inkLight, '--ck-ev-ink-d': c.inkDark })
    expect(eventColorStyle('teal')).toEqual({ '--ck-ev': 'teal' })
    expect(eventColorStyle('red; } body { display: none')).toEqual({})
    expect(eventColorStyle(undefined)).toEqual({})
  })

  test("the event's colour wins over its calendar's, which wins over the fallback", () => {
    const calendars = [{ id: 'w', label: 'Work', color: '#047857' }]
    expect(resolveEventColor({ id: '1', title: 'a', start: new Date(), end: new Date(), color: '#be185d', calendarId: 'w' }, calendars, '#000')).toBe('#be185d')
    expect(resolveEventColor({ id: '1', title: 'a', start: new Date(), end: new Date(), calendarId: 'w' }, calendars, '#000')).toBe('#047857')
    expect(resolveEventColor({ id: '1', title: 'a', start: new Date(), end: new Date(), calendarId: 'x' }, calendars, '#000')).toBe('#000')
    expect(resolveEventColor({ id: '1', title: 'a', start: new Date(), end: new Date() }, undefined)).toBeUndefined()
  })

  test('month chips, all-day bars and resource blocks carry the resolved colour', () => {
    const day = new Date(2026, 9, 14)
    const { unmount } = render(
      <Scheduler
        view="month"
        date={day}
        calendars={[{ id: 'w', label: 'Work', color: '#047857' }]}
        events={[
          { id: 'rv', title: 'Review', start: new Date(2026, 9, 14, 10), end: new Date(2026, 9, 14, 11), calendarId: 'w' },
          { id: 'off', title: 'Offsite', start: new Date(2026, 9, 15), end: new Date(2026, 9, 16), allDay: true, color: '#ffff00' },
        ]}
      />,
    )
    expect(varsOf(screen.getByText('Review').parentElement!.querySelector('.ck-dot')!)).toBe(eventColors('#047857')!.solid)
    const bar = screen.getByText('Offsite').parentElement!
    expect(bar.className).toContain('ck-event')
    expect(varsOf(bar)).toBe(eventColors('#ffff00')!.solid)
    unmount()
    render(<Scheduler view="resource" date={day} resources={[{ id: 'a', label: 'Room A', color: '#be185d' }]} events={[{ id: 'rv', title: 'Review', start: new Date(2026, 9, 14, 10), end: new Date(2026, 9, 14, 11), resourceId: 'a' }]} />)
    const block = screen.getByText('Review').parentElement!
    expect(block.className).toContain('ck-event')
    expect(varsOf(block)).toBe(eventColors('#be185d')!.solid)
  })

  test('the stylesheet fills events by theme: tint and ink (calm), solid and white (vivid), card (editorial)', () => {
    // Declarations per (media query, selector), later ones winning: the minifier puts color-mix() in
    // an @supports block after a plain fallback, which modern browsers override.
    const fills: Record<string, Record<string, string>> = {}
    postcss.parse(css).walkRules((rule) => {
      if (!rule.selector.includes('.ck-event')) return
      let media = ''
      for (let parent = rule.parent; parent && parent.type === 'atrule'; parent = parent.parent) {
        if ((parent as postcss.AtRule).name === 'media') media = `@${(parent as postcss.AtRule).params} `
      }
      const decls = (fills[media + rule.selector] ??= {})
      rule.walkDecls(/^(background-color|color)$/, (d) => void (decls[d.prop] = d.value))
    })
    const find = (part: string) => {
      const decls = Object.entries(fills).find(([selector]) => selector.includes(part))?.[1] ?? {}
      return Object.entries(decls).map(([prop, value]) => `${prop}:${value}`).join(';')
    }
    expect(find('.ck-root .ck-event')).toMatch(/color-mix\(in srgb, *var\(--ck-ev,var\(--ck-event\)\) 14%, *var\(--ck-background\)\);color:var\(--ck-ev-ink-l/)
    expect(find('data-ck-mode=dark')).toMatch(/26%.*color:var\(--ck-ev-ink-d/)
    expect(find('@(prefers-color-scheme:dark)')).toMatch(/26%.*color:var\(--ck-ev-ink-d/)
    expect(find('data-ck-theme=vivid')).toBe('background-color:var(--ck-ev,var(--ck-event));color:#fff')
    expect(find('data-ck-theme=editorial')).toBe('background-color:var(--ck-background);color:var(--ck-foreground)')
  })
})
