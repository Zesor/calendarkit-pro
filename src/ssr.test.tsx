// Spec §3, §12: the Scheduler renders on the server (no window, no document at import or render),
// in every layout, and the page hydrates without a mismatch warning.
// @vitest-environment node
import React from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, test, vi } from 'vitest'
import type { CalendarEvent } from './types'

const day = new Date(2026, 9, 14)
const review: CalendarEvent = { id: 'rv', title: 'Design review', start: new Date(2026, 9, 14, 10), end: new Date(2026, 9, 14, 11) }

describe('server rendering', () => {
  test('imports and renders without window or document, in the three layouts and five views, and without a warning (React 18 warns on useLayoutEffect)', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const others = [vi.spyOn(console, 'warn').mockImplementation(() => {}), vi.spyOn(console, 'log').mockImplementation(() => {})]
    expect(typeof window).toBe('undefined')
    const { Scheduler } = await import('./index')
    for (const layout of ['classic', 'focus', 'flow'] as const) {
      const html = renderToString(<Scheduler layout={layout} events={[review]} view="week" date={day} />)
      expect(html).toContain('Design review')
    }
    for (const view of ['month', 'day', 'agenda', 'resource'] as const) {
      expect(renderToString(<Scheduler events={[review]} view={view} date={day} resources={[{ id: 'a', label: 'Room A' }]} />)).toContain('ck-root')
    }
    expect(errors.mock.calls.map((c) => String(c[0]))).toEqual([])
    for (const spy of others) expect(spy).not.toHaveBeenCalled()
  })
})
