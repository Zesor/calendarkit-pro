import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { CalendarEvent } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const isEventDragDisabled = (event?: CalendarEvent) => event?.draggable === false

// An event without an explicit `resizable` inherits the lock from `draggable`.
export const isEventResizeDisabled = (event?: CalendarEvent) =>
  event?.resizable === false || (event?.resizable === undefined && isEventDragDisabled(event))
