import React from 'react';
import { safeColor } from '../core/color';
import { eventColors } from '../core/eventColors';
import type { CalendarEvent, CalendarProps } from '../types';

type Calendars = CalendarProps['calendars'];

const CalendarsContext = React.createContext<Calendars>(undefined);

/** Lets the views colour an event after its calendar (`calendarId` → `calendars[].color`). */
export const EventColorProvider = CalendarsContext.Provider;

/**
 * Inline variables of an event's fill (see src/styles/events.css): the readable solid and inks of a
 * hex or rgb() colour; any other safe colour as the fill only; nothing for no colour (theme colour).
 */
export function eventColorStyle(color?: string): React.CSSProperties {
  if (!color) return {};
  const colors = eventColors(color);
  if (colors) return { '--ck-ev': colors.solid, '--ck-ev-ink-l': colors.inkLight, '--ck-ev-ink-d': colors.inkDark } as React.CSSProperties;
  const safe = safeColor(color, '');
  return safe ? ({ '--ck-ev': safe } as React.CSSProperties) : {};
}

/** The colour an event is drawn with: its own, else its calendar's, else `fallback` (e.g. its resource's). */
export function resolveEventColor(event: CalendarEvent, calendars: Calendars, fallback?: string): string | undefined {
  return event.color || calendars?.find((calendar) => calendar.id === event.calendarId)?.color || fallback;
}

/** The Scheduler's calendars, for `resolveEventColor` inside lists. */
export const useCalendars = () => React.useContext(CalendarsContext);

/** `eventColorStyle` of the colour `resolveEventColor` picks, with the calendars of the Scheduler. */
export function useEventColorStyle(event: CalendarEvent, fallback?: string): React.CSSProperties {
  const calendars = React.useContext(CalendarsContext);
  return eventColorStyle(resolveEventColor(event, calendars, fallback));
}
