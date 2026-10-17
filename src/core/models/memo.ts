import type { CalendarState } from '../store'

/**
 * Caches a model per state snapshot and key: selectors stay pure, and a component re-reading the
 * same snapshot gets the same object back.
 */
export function memoByState<T>(cache: WeakMap<CalendarState, Map<string, T>>, state: CalendarState, key: string, compute: () => T): T {
  let byKey = cache.get(state)
  if (!byKey) {
    byKey = new Map()
    cache.set(state, byKey)
  }
  let value = byKey.get(key)
  if (value === undefined) {
    value = compute()
    byKey.set(key, value)
  }
  return value
}
