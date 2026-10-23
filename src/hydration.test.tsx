// The server's HTML hydrates in the browser without a mismatch: the phone layout only switches after
// the first measure, so the first client render matches the server's.
import { act, cleanup } from '@testing-library/react'
import React from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { Scheduler } from './index'
import type { CalendarEvent } from './types'

afterEach(cleanup)
const day = new Date(2026, 9, 14)
const review: CalendarEvent = { id: 'rv', title: 'Design review', start: new Date(2026, 9, 14, 10), end: new Date(2026, 9, 14, 11) }

describe('hydration', () => {
  test.each(['classic', 'focus', 'flow'] as const)('%s: no hydration error', async (layout) => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const element = <Scheduler layout={layout} events={[review]} view="week" date={day} />
    const container = document.createElement('div')
    container.innerHTML = renderToString(element)
    document.body.appendChild(container)
    const root = await act(async () => hydrateRoot(container, element, { onRecoverableError: (e) => console.error(e) }))
    // jsdom has a window, so the "server" render here takes the client's layout effects: React 18's
    // server warning about them is an artefact of this test (ssr.test.tsx checks the real server).
    expect(errors.mock.calls.map((c) => String(c[0])).filter((m) => !m.includes('useLayoutEffect does nothing on the server'))).toEqual([])
    act(() => root.unmount())
    container.remove()
    errors.mockRestore()
  })
  test.each(['week', 'day'] as const)('%s view of today, three minutes between the server render and hydration: no hydration error', async (view) => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 9, 14, 10, 0) })
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const element = <Scheduler view={view} events={[review]} />
    const container = document.createElement('div')
    container.innerHTML = renderToString(element)
    document.body.appendChild(container)
    vi.setSystemTime(new Date(2026, 9, 14, 10, 3))
    const root = await act(async () => hydrateRoot(container, element, { onRecoverableError: (e) => console.error(e) }))
    expect(errors.mock.calls.map((c) => String(c[0])).filter((m) => !m.includes('useLayoutEffect does nothing on the server'))).toEqual([])
    act(() => root.unmount())
    container.remove()
    errors.mockRestore()
    vi.useRealTimers()
  })
})
