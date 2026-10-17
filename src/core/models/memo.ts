import type { CalendarEvent } from '../../types'

/**
 * Caches a model per visible-events array and key. The store keeps `visible` stable while events,
 * the zone and hidden calendars do not change, so dialog and draft updates reuse the models.
 */
export function memoByEvents<T>(cache: WeakMap<CalendarEvent[], Map<string, T>>, events: CalendarEvent[], key: string, compute: () => T): T {
  let byKey = cache.get(events)
  if (!byKey) {
    byKey = new Map()
    cache.set(events, byKey)
  }
  let value = byKey.get(key)
  if (value === undefined) {
    value = compute()
    byKey.set(key, value)
  }
  return value
}
