import React from 'react';
import { addDays, format, isSameDay, Locale } from 'date-fns';
import type { CalendarEvent, CalendarProps, CalendarTranslations } from '../types';
import { interpolate, timeFormats } from '../core/format';
import { toDisplay } from '../core/timezone';

/**
 * An event's full accessible name (spec §8.8): "Design review, Thursday 15 October, 10:00 AM to
 * 11:45 AM, Work calendar, Room B" — so it never rests on colour or position alone.
 */
export function eventLabel(event: CalendarEvent, { t, timezone, locale, calendars }: { t: CalendarTranslations; timezone?: string; locale?: Locale; calendars?: CalendarProps['calendars'] }): string {
  const day = (d: Date) => format(d, 'EEEE d MMMM', { locale });
  const start = toDisplay(event.start, timezone);
  const end = toDisplay(event.end, timezone);
  let when: string;
  if (event.allDay) {
    // All-day ends are exclusive (midnight after the last day).
    const last = addDays(end, -1);
    when = isSameDay(start, last) || last < start ? `${day(start)}, ${t.allDay}` : `${interpolate(t.dayRange, { start: day(start), end: day(last) })}, ${t.allDay}`;
  } else {
    const time = (d: Date) => format(d, timeFormats(locale).time, { locale });
    when = isSameDay(start, end)
      ? `${day(start)}, ${interpolate(t.timeRange, { start: time(start), end: time(end) })}`
      : interpolate(t.timeRange, { start: `${day(start)}, ${time(start)}`, end: `${day(end)}, ${time(end)}` });
  }
  const calendar = calendars?.find((c) => c.id === event.calendarId);
  return [event.title || t.noTitle, when, calendar && interpolate(t.inCalendar, { name: calendar.label }), event.place?.name ?? event.location].filter(Boolean).join(', ');
}

// The Scheduler's labeller (language, zone, calendars), read where events are drawn.
const EventLabelContext = React.createContext<(event: CalendarEvent) => string>((event) => event.title);
export const EventLabelProvider = EventLabelContext.Provider;
export const useEventLabel = () => React.useContext(EventLabelContext);
