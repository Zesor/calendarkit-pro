import React from 'react';
import { addDays, differenceInMinutes, format, isSameDay, Locale, startOfDay, startOfWeek } from 'date-fns';
import type { CalendarEvent, CalendarTranslations } from '../types';
import type { FlowDayModel } from '../core/models/lists';
import { interpolate, timeFormats } from '../core/format';
import { toDisplay } from '../core/timezone';
import { resolveWeekStartsOn } from '../core/week';
import { cx } from '../utils';
import { ChevronLeft, ChevronRight, Plus } from '../components/icons';
import { eventColorStyle, resolveEventColor, useCalendars } from '../components/eventColor';
import { useClassNames } from '../components/customize';
import { durationLabel } from '../components/duration';

interface FlowViewProps {
  /** The day shown (wall clock of the display zone). */
  date: Date;
  events: CalendarEvent[];
  /** The day's feed: all-day events, then timed events, free slots and the current time in order. */
  model: (day: Date, now: Date) => FlowDayModel;
  timezone?: string;
  locale?: Locale;
  translations: CalendarTranslations;
  onDateChange: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  /** Undefined in read-only mode. */
  onBook?: (start: Date, end: Date) => void;
  onCreate?: () => void;
}

/**
 * Flow layout (spec §8.1): the week's days as a strip (with how busy each is), the chosen day as a
 * feed of cards in order, free slots to book, the current time, and a floating Create.
 */
export const FlowView: React.FC<FlowViewProps> = ({ date, events, model, timezone, locale, translations: t, onDateChange, onEventClick, onBook, onCreate }) => {
  const calendars = useCalendars();
  const classNames = useClassNames();
  // The current time moves every minute.
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const day = startOfDay(date);
  const flow = model(day, now);
  const formats = timeFormats(locale);
  const time = (d: Date) => format(d, formats.time, { locale });
  const today = startOfDay(toDisplay(now, timezone));
  const weekStart = startOfWeek(day, { weekStartsOn: resolveWeekStartsOn(locale, 1) });
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const covering = (d: Date) => events.filter((e) => toDisplay(e.start, timezone) < addDays(d, 1) && toDisplay(e.end, timezone) > d);
  const card = "ck-event ck:flex ck:w-full ck:items-start ck:gap-3 ck:rounded-xl ck:px-3.5 ck:py-2.5 ck:text-left ck:transition-[filter] ck:hover:brightness-95";

  return (
    <div className="ck:relative ck:mx-auto ck:flex ck:min-h-0 ck:w-full ck:max-w-3xl ck:flex-1 ck:flex-col">
      <div className="ck:flex ck:items-center ck:gap-1 ck:px-5 ck:pt-4 ck:pb-1">
        <h2 className="ck:flex-1 ck:font-display ck:text-xl ck:font-semibold ck:text-foreground ck:first-letter:uppercase">{format(day, 'MMMM yyyy', { locale })}</h2>
        <button type="button" onClick={() => onDateChange(addDays(day, -7))} aria-label={t.previous} className="ck:flex ck:h-9 ck:w-9 ck:items-center ck:justify-center ck:rounded-full ck:text-muted-foreground ck:hover:bg-muted ck:hover:text-foreground"><ChevronLeft className="ck:h-4 ck:w-4" aria-hidden="true" /></button>
        <button type="button" onClick={() => onDateChange(addDays(day, 7))} aria-label={t.next} className="ck:flex ck:h-9 ck:w-9 ck:items-center ck:justify-center ck:rounded-full ck:text-muted-foreground ck:hover:bg-muted ck:hover:text-foreground"><ChevronRight className="ck:h-4 ck:w-4" aria-hidden="true" /></button>
      </div>

      <div role="group" aria-label={t.daysOfWeek} className="ck:flex ck:gap-2 ck:overflow-x-auto ck:px-5 ck:pt-2 ck:pb-3.5">
        {week.map((d) => {
          const busy = covering(d);
          const pressed = isSameDay(d, day);
          return (
            <button
              key={d.getTime()}
              type="button"
              aria-pressed={pressed}
              aria-label={`${format(d, 'EEEE d MMMM', { locale })}, ${interpolate(t.eventsCount, { n: busy.length })}`}
              onClick={() => onDateChange(d)}
              className={cx("ck:flex ck:min-h-[76px] ck:min-w-16 ck:flex-1 ck:flex-col ck:items-center ck:justify-center ck:gap-0.5 ck:rounded-xl ck:text-xs ck:font-semibold ck:uppercase ck:tracking-wide ck:transition-colors", pressed ? "ck:bg-primary ck:text-primary-foreground" : "ck:bg-muted ck:text-muted-foreground ck:hover:bg-accent")}
            >
              {format(d, 'EEE', { locale })}
              <span className={cx("ck:font-display ck:text-xl ck:font-medium ck:normal-case ck:tracking-normal", !pressed && (isSameDay(d, today) ? "ck:text-primary" : "ck:text-foreground"))}>{format(d, 'd')}</span>
              <span className="ck:flex ck:h-1.5 ck:gap-0.5" aria-hidden="true">
                {busy.slice(0, 4).map((e) => <i key={e.id} className={cx("ck:h-1.5 ck:w-1.5 ck:rounded-full", pressed ? "ck:bg-primary-foreground" : "ck-dot")} style={pressed ? undefined : eventColorStyle(resolveEventColor(e, calendars))} />)}
              </span>
            </button>
          );
        })}
      </div>

      <ol aria-label={format(day, 'EEEE d MMMM', { locale })} className="ck:flex ck:min-h-0 ck:flex-1 ck:flex-col ck:gap-2.5 ck:overflow-y-auto ck:px-5 ck:pt-1 ck:pb-24">
        {flow.allDay.map((event) => (
          <li key={event.id} className="ck:flex ck:items-stretch ck:gap-3.5">
            <span className="ck:w-14 ck:shrink-0 ck:pt-2.5 ck:text-right ck:text-xs ck:text-muted-foreground">{t.allDay}</span>
            <button type="button" data-ck-event-id={event.id} className={cx(card, classNames.event)} style={eventColorStyle(resolveEventColor(event, calendars))} onClick={() => onEventClick(event)}>
              <span className="ck:text-sm ck:font-semibold">{event.title || t.noTitle}</span>
            </button>
          </li>
        ))}
        {flow.items.map((item) => {
          if (item.kind === 'now') {
            return (
              <li key="now" className="ck:flex ck:items-center ck:gap-3.5" aria-label={time(item.at)}>
                <span className="ck:w-14 ck:shrink-0 ck:text-right ck:text-xs ck:font-bold ck:text-primary ck:tabular-nums">{time(item.at)}</span>
                <span className="ck:h-0.5 ck:flex-1 ck:rounded-full ck:bg-primary" aria-hidden="true" />
              </li>
            );
          }
          if (item.kind === 'free') {
            return (
              <li key={`free-${item.start.getTime()}`} className="ck:flex ck:items-stretch ck:gap-3.5">
                <span className="ck:w-14 ck:shrink-0 ck:pt-3.5 ck:text-right ck:text-xs ck:text-muted-foreground ck:tabular-nums">{time(item.start)}</span>
                <button
                  type="button"
                  disabled={!onBook}
                  onClick={() => onBook?.(item.start, item.end)}
                  className="ck:flex ck:min-h-12 ck:flex-1 ck:items-center ck:justify-between ck:rounded-xl ck:border-[1.5px] ck:border-dashed ck:border-border ck:px-3.5 ck:text-sm ck:text-muted-foreground ck:enabled:hover:border-foreground ck:enabled:hover:text-foreground"
                >
                  <span>{interpolate(t.freeSlot, { duration: durationLabel(differenceInMinutes(item.end, item.start), t) })}</span>
                  {onBook && <span className="ck:inline-flex ck:items-center ck:gap-1.5 ck:font-semibold">{t.book}<Plus className="ck:h-3.5 ck:w-3.5" aria-hidden="true" /></span>}
                </button>
              </li>
            );
          }
          const { event } = item;
          return (
            <li key={`${event.id}-${item.start.getTime()}`} className="ck:flex ck:items-stretch ck:gap-3.5">
              <span className="ck:w-14 ck:shrink-0 ck:pt-3 ck:text-right ck:text-xs ck:text-muted-foreground ck:tabular-nums">{time(item.start)}</span>
              <button type="button" data-ck-event-id={event.id} className={cx(card, classNames.event)} style={eventColorStyle(resolveEventColor(event, calendars))} onClick={() => onEventClick(event)}>
                <span className="ck:min-w-0">
                  <span className="ck:block ck:text-[15px] ck:font-semibold ck:break-words">{event.title || t.noTitle}</span>
                  <span className="ck:mt-0.5 ck:block ck:text-xs ck:opacity-90 ck:tabular-nums">
                    {[`${time(item.start)} – ${time(item.end)}`, durationLabel(differenceInMinutes(item.end, item.start), t), event.place?.name ?? event.location].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
        {flow.allDay.length === 0 && flow.items.every((i) => i.kind !== 'event') && (
          <li className="ck:py-6 ck:text-center ck:text-sm ck:text-muted-foreground">{t.nothingPlanned}</li>
        )}
      </ol>

      {onCreate && (
        <button type="button" onClick={onCreate} className="ck:absolute ck:right-5 ck:bottom-5 ck:z-20 ck:flex ck:min-h-14 ck:items-center ck:gap-2 ck:rounded-full ck:bg-primary ck:px-6 ck:text-[15px] ck:font-semibold ck:text-primary-foreground ck:shadow-[0_12px_28px_-10px_rgb(0_0_0/0.45)] ck:hover:bg-primary/90">
          <Plus className="ck:h-5 ck:w-5" aria-hidden="true" />{t.create}
        </button>
      )}
    </div>
  );
};
