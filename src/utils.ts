import type { CalendarEvent } from "./types"

/** Joins the truthy class names. Never merges them: no element gets two classes for the same property. */
export const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ")

export const isEventDragDisabled = (event?: CalendarEvent) => event?.draggable === false

// An event without an explicit `resizable` inherits the lock from `draggable`.
export const isEventResizeDisabled = (event?: CalendarEvent) =>
  event?.resizable === false || (event?.resizable === undefined && isEventDragDisabled(event))
