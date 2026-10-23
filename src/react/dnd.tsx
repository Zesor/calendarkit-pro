import React from 'react'
import {
  type CollisionDetection, DndContext, type DragEndEvent, type DragStartEvent, type Modifier, PointerSensor, type SensorDescriptor,
  type SensorOptions, pointerWithin, rectIntersection, useDndContext, useDraggable, useDroppable, useSensor, useSensors,
} from '@dnd-kit/core'
import type { CalendarEvent, CalendarStore, MoveTarget } from 'calendarkit-pro/core'
import { useCalendarSelector } from './useCalendar'

/** Data an event puts on its draggable (`useDraggableEvent`). */
export interface DragData {
  eventId: string
  event: CalendarEvent
  grabOffsetMs?: number
  grabDayOffset?: number
}

/** Data a slot puts on its droppable (`useDroppableSlot`). */
export interface DropData {
  date: Date
  resourceId?: string
  allDayRow?: boolean
}

/**
 * All-day bars move by "grabbed day → day under the pointer", so they target the cell under the
 * pointer; the overlay (left-aligned with the bar) would point at the wrong day. Timed events keep
 * dnd-kit's overlay-based detection.
 */
export const dayAwareCollision: CollisionDetection = (args) => {
  if (args.active.data.current?.grabDayOffset !== undefined) {
    const underPointer = pointerWithin(args)
    if (underPointer.length > 0) return underPointer
  }
  return rectIntersection(args)
}

/** Turns a dnd-kit drop into the store's move: which event, and where. `null` when nothing moves. */
export function dragEndToMove(drag: Pick<DragEndEvent, 'active' | 'over'>): { eventId: string; target: MoveTarget } | null {
  const data = drag.active.data.current as Partial<DragData> | undefined
  const drop = drag.over?.data.current as Partial<DropData> | undefined
  const eventId = data?.eventId ?? data?.event?.id
  if (!eventId || !drop?.date) return null
  return {
    eventId,
    target: { date: drop.date, resourceId: drop.resourceId, allDayRow: drop.allDayRow, grabOffsetMs: data?.grabOffsetMs, grabDayOffset: data?.grabDayOffset },
  }
}

/**
 * dnd-kit context wired to a calendar store: drops call `calendar.move`, all-day bars target the
 * day under the pointer, and dragging is off in `readOnly`.
 */
/**
 * What a screen reader hears during a pointer drag, in the calendar's language (dnd-kit's defaults
 * are English and name the drag id). Moving over targets says nothing: the end says where it went.
 */
export function dragAnnouncements(t: { dragStart: string; dragEnd: string; dragCancel: string }) {
  const say = (text: string, active: { data: { current?: unknown } }) => text.replace('{title}', (active.data.current as DragData | undefined)?.event.title ?? '')
  return {
    onDragStart: ({ active }: { active: { data: { current?: unknown } } }) => say(t.dragStart, active),
    onDragOver: (_moving?: unknown) => undefined,
    onDragEnd: ({ active, over }: { active: { data: { current?: unknown } }; over: unknown }) => say(over ? t.dragEnd : t.dragCancel, active),
    onDragCancel: ({ active }: { active: { data: { current?: unknown } } }) => say(t.dragCancel, active),
  }
}

export function CalendarDndContext({ calendar, children, id, modifiers, sensors, onDragStart, onDragEnd, announcements }: {
  calendar: CalendarStore
  children?: React.ReactNode
  id?: string
  modifiers?: Modifier[]
  sensors?: SensorDescriptor<SensorOptions>[]
  onDragStart?: (event: DragStartEvent) => void
  onDragEnd?: (event: DragEndEvent) => void
  /** Drag announcements (`dragAnnouncements(t)`); without them, dnd-kit's English defaults. */
  announcements?: ReturnType<typeof dragAnnouncements>
}) {
  const readOnly = useCalendarSelector(calendar, (s) => s.readOnly)
  const defaults = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  return (
    <DndContext
      id={id}
      sensors={readOnly ? [] : sensors ?? defaults}
      modifiers={modifiers}
      collisionDetection={dayAwareCollision}
      // Pointer drags only (no keyboard sensor): no keyboard instructions to read out.
      accessibility={announcements && { announcements, screenReaderInstructions: { draggable: '' } }}
      onDragStart={onDragStart}
      onDragEnd={(event) => {
        onDragEnd?.(event)
        const move = dragEndToMove(event)
        if (move) calendar.move(move.eventId, move.target)
      }}
    >
      {children}
    </DndContext>
  )
}

/** `useDraggable` with the calendar's data contract. */
export function useDraggableEvent(event: CalendarEvent, options: { id?: string; grabOffsetMs?: number; grabDayOffset?: number; disabled?: boolean } = {}) {
  const data: DragData = { eventId: event.id, event, grabOffsetMs: options.grabOffsetMs, grabDayOffset: options.grabDayOffset }
  return useDraggable({ id: options.id ?? event.id, data, disabled: options.disabled })
}

/** `useDroppable` with the calendar's data contract. `date` is a wall-clock slot of the display timezone. */
export function useDroppableSlot(date: Date, options: { id?: string; resourceId?: string; allDayRow?: boolean; disabled?: boolean } = {}) {
  const data: DropData = { date, resourceId: options.resourceId, allDayRow: options.allDayRow }
  return useDroppable({ id: options.id ?? `${date.toISOString()}${options.resourceId ? `|${options.resourceId}` : ''}${options.allDayRow ? '|all-day' : ''}`, data, disabled: options.disabled })
}

/** The event being dragged, to draw a custom ghost (`DragOverlay`). */
export function useActiveDrag(): CalendarEvent | null {
  const { active } = useDndContext()
  return (active?.data.current as Partial<DragData> | undefined)?.event ?? null
}
