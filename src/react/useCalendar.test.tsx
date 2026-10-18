import { act, render, renderHook, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { type CalendarStore, selectTimeGrid } from 'calendarkit-pro/core'
import type { CalendarEvent } from '../types'
import { CalendarProvider, useCalendarContext } from './context'
import { useCalendar, useCalendarSelector, useCalendarState } from './useCalendar'

afterEach(cleanup)

const now = () => new Date(2026, 9, 14, 11, 52)
const lunch: CalendarEvent = { id: 'lu', title: 'Lunch', start: new Date(2026, 9, 14, 12, 30), end: new Date(2026, 9, 14, 13, 30) }

describe('useCalendar', () => {
  test('creates the store once and keeps it across renders', () => {
    const { result, rerender } = renderHook((props: { events: CalendarEvent[] }) => useCalendar({ events: props.events, now }), { initialProps: { events: [lunch] } })
    const first = result.current
    rerender({ events: [] })
    expect(result.current).toBe(first)
    expect(first.getState().events).toEqual([])
  })

  test('callbacks are always the latest ones, without a new snapshot', () => {
    const calls: string[] = []
    const events = [lunch] // the same array across renders: only the callback changes
    const { result, rerender } = renderHook((props: { tag: string }) => useCalendar({ events, now, onEventDelete: (id) => calls.push(`${props.tag}:${id}`) }), { initialProps: { tag: 'first' } })
    const before = result.current.getState()
    rerender({ tag: 'second' })
    expect(result.current.getState()).toBe(before)
    act(() => result.current.remove('lu'))
    expect(calls).toEqual(['second:lu'])
  })

  test('a prop removed between renders is cleared in the store (controlled view becomes uncontrolled)', () => {
    const { result, rerender } = renderHook((props: { view?: 'day' }) => useCalendar({ now, ...props }), { initialProps: { view: 'day' } as { view?: 'day' } })
    expect(result.current.getState().view).toBe('day')
    rerender({})
    expect(result.current.getState().view).toBe('week')
  })
})

describe('useCalendarSelector and useCalendarState', () => {
  function View({ calendar, onRender }: { calendar: CalendarStore; onRender: () => void }) {
    onRender()
    const view = useCalendarSelector(calendar, (s) => s.view)
    const grid = useCalendarSelector(calendar, (s) => selectTimeGrid(s, { now: now() }))
    return <p>{view} {grid.columns.length}</p>
  }

  test('re-renders when the selected slice changes, not when another one does', () => {
    const onRender = vi.fn()
    function Harness() {
      const calendar = useCalendar({ events: [lunch], now })
      return <><View calendar={calendar} onRender={onRender} /><button onClick={() => calendar.setView('day')}>day</button><button onClick={() => calendar.openEvent('lu')}>open</button></>
    }
    render(<Harness />)
    expect(screen.getByText('week 7')).toBeTruthy()
    const renders = onRender.mock.calls.length
    act(() => screen.getByText('open').click())
    expect(onRender.mock.calls.length).toBe(renders)
    act(() => screen.getByText('day').click())
    expect(screen.getByText('day 1')).toBeTruthy()
  })

  test('useCalendarState follows every change', () => {
    const { result } = renderHook(() => {
      const calendar = useCalendar({ now })
      return { calendar, state: useCalendarState(calendar) }
    })
    act(() => result.current.calendar.openSlot(new Date(2026, 9, 15, 9)))
    expect(result.current.state.dialog?.kind).toBe('quick')
  })
})

describe('parents that rebuild their events on every render', () => {
  test('a new events array per parent render costs one extra render, never a loop', () => {
    const onRender = vi.fn()
    function Child({ events }: { events: CalendarEvent[] }) {
      const calendar = useCalendar({ events, now })
      onRender()
      return <p>{useCalendarSelector(calendar, (s) => s.events.length)} events</p>
    }
    function Parent() {
      const [n, setN] = React.useState(0)
      // A fresh array on every render, like `events={items.map(toEvent)}`.
      return <><Child events={[lunch].map((e) => ({ ...e }))} /><button onClick={() => setN(n + 1)}>again {n}</button></>
    }
    render(<Parent />)
    for (let i = 0; i < 3; i++) act(() => screen.getByRole('button').click())
    expect(screen.getByText('1 events')).toBeTruthy()
    expect(onRender.mock.calls.length).toBeLessThanOrEqual(1 + 3 * 2)
  })
})

describe('CalendarProvider', () => {
  test('gives the store to the components below; outside a provider it throws a clear error', () => {
    function Title() {
      const calendar = useCalendarContext()
      return <span>{useCalendarSelector(calendar, (s) => s.view)}</span>
    }
    function App() {
      const calendar = useCalendar({ defaultView: 'month', now })
      return <CalendarProvider calendar={calendar}><Title /></CalendarProvider>
    }
    render(<App />)
    expect(screen.getByText('month')).toBeTruthy()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Title />)).toThrow('useCalendarContext must be used inside a <CalendarProvider>.')
  })
})
