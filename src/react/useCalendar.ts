import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { type CalendarOptions, type CalendarState, type CalendarStore, createCalendar } from 'calendarkit-pro/core'

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

// Every option, unset: props that disappear between renders are cleared in the store too.
const UNSET: { [K in keyof Required<CalendarOptions>]: undefined } = {
  events: undefined, defaultEvents: undefined, view: undefined, defaultView: undefined, date: undefined, defaultDate: undefined,
  timezone: undefined, readOnly: undefined, language: undefined, now: undefined, createId: undefined,
  onEventCreate: undefined, onEventUpdate: undefined, onEventDelete: undefined, onEventDrop: undefined, onEventResize: undefined,
  onOccurrenceDelete: undefined, onViewChange: undefined, onDateChange: undefined, onEventsChange: undefined,
}

/**
 * Creates a calendar store once and keeps its options in sync with the props. Callbacks are always
 * the latest ones; changing only callbacks does not re-render (the store ignores no-op changes).
 */
export function useCalendar(options: CalendarOptions = {}): CalendarStore {
  const [calendar] = useState(() => createCalendar(options))
  useIsomorphicLayoutEffect(() => {
    calendar.setOptions({ ...UNSET, ...options })
  })
  return calendar
}

/**
 * Reads a slice of the calendar state and re-renders only when that slice changes. The selector
 * must return stable values: state fields, or the memoized models (`selectTimeGrid`, …).
 */
export function useCalendarSelector<T>(calendar: CalendarStore, selector: (state: CalendarState) => T): T {
  const cache = useRef<{ state?: CalendarState; selector?: (state: CalendarState) => T; value?: T }>({})
  const getSnapshot = () => {
    const state = calendar.getState()
    const c = cache.current
    if (c.state !== state || c.selector !== selector) {
      cache.current = { state, selector, value: selector(state) }
    }
    return cache.current.value as T
  }
  return useSyncExternalStore(calendar.subscribe, getSnapshot, getSnapshot)
}

/** The whole calendar state (re-renders on every change). */
export function useCalendarState(calendar: CalendarStore): CalendarState {
  return useSyncExternalStore(calendar.subscribe, calendar.getState, calendar.getState)
}
