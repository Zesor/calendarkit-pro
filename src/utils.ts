import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { warnOnce } from "./core/warn"
import type { CalendarEvent } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Merges class names with clsx and tailwind-merge.
 *
 * @deprecated `cn` will be removed from calendarkit-pro in 2.0 (clsx and tailwind-merge are dropped).
 * Copy it into your project instead:
 * `const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))`
 */
export function deprecatedCn(...inputs: ClassValue[]) {
  warnOnce(
    "deprecated-cn",
    "`cn` is deprecated and will be removed in 2.0. Copy it into your project: `twMerge(clsx(inputs))`."
  )
  return cn(...inputs)
}

export const isEventDragDisabled = (event?: CalendarEvent) => event?.draggable === false

// An event without an explicit `resizable` inherits the lock from `draggable`.
export const isEventResizeDisabled = (event?: CalendarEvent) =>
  event?.resizable === false || (event?.resizable === undefined && isEventDragDisabled(event))
