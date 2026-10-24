import React, { useEffect, useId, useRef, useState } from 'react';
import { addDays, differenceInMinutes, format, isSameDay, Locale } from 'date-fns';
import { CalendarEvent, CalendarTranslations } from '../types';
import { timeFormats } from '../core/format';
import { toDisplay } from '../core/timezone';
import { cx } from '../utils';
import { AlignLeft, Bell, Calendar, Clock, Copy, Edit2, MapPin, Navigation, Paperclip, Trash2, Users, X } from './icons';
import { reminderLabel } from './EventModal';
import { directionsUrl, isSafeUrl, mapsUrl } from './links';
import { eventColorStyle, resolveEventColor, useCalendars } from './eventColor';
import { useClassNames } from './customize';
import { durationLabel } from './duration';
import { Box, placeBeside } from './placement';
import { useDialogFocus } from './useDialogFocus';
import { useIsomorphicLayoutEffect } from '../hooks/useIsomorphicLayoutEffect';

const WIDTH = 340;
const MARGIN = 8;

interface EventPopoverProps {
  event: CalendarEvent;
  /** The event's box on screen (viewport coordinates), or a point; centred near the top without one. */
  anchor: Box | null;
  timezone?: string;
  locale?: Locale;
  translations: CalendarTranslations;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
  /** Phone layout (spec §8.9): a bottom sheet over the calendar instead of a card beside the event. */
  docked?: boolean;
}

/** The event's real dates in the display zone, as two lines: the day(s), then the times and length. */
function when(event: CalendarEvent, timezone: string | undefined, locale: Locale | undefined, t: CalendarTranslations): [string, string?] {
  const start = toDisplay(event.start, timezone);
  const end = toDisplay(event.end, timezone);
  if (event.allDay) {
    // All-day ends are exclusive (midnight after the last day).
    const last = addDays(end, -1);
    return isSameDay(start, last) || last < start
      ? [format(start, 'EEEE d MMMM', { locale }), t.allDay]
      : [`${format(start, 'EEE d MMM', { locale })} – ${format(last, 'EEE d MMM', { locale })}`, t.allDay];
  }
  const time = timeFormats(locale).time;
  const length = durationLabel(differenceInMinutes(end, start), t);
  return isSameDay(start, end)
    ? [format(start, 'EEEE d MMMM', { locale }), `${format(start, time, { locale })} – ${format(end, time, { locale })} · ${length}`]
    : [`${format(start, `EEE d MMM, ${time}`, { locale })} –`, `${format(end, `EEE d MMM, ${time}`, { locale })} · ${length}`];
}

/** One line of the card: a muted icon, then its content. */
const Row: React.FC<{ icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; label?: string; children: React.ReactNode }> = ({ icon: Icon, label, children }) => (
  <div className="ck:flex ck:items-start ck:gap-3 ck:py-1 ck:text-sm ck:text-muted-foreground">
    <Icon className="ck:w-4 ck:h-4 ck:mt-0.5 ck:shrink-0 ck:opacity-80" aria-hidden="true" />
    <div className="ck:min-w-0 ck:flex-1">{label && <span className="ck:sr-only">{label}</span>}{children}</div>
  </div>
);

/** Spec §8.1 (Classic): an event's details beside it, with Edit / Duplicate / Delete. */
export const EventPopover: React.FC<EventPopoverProps> = ({ event, anchor, timezone, locale, translations: t, onEdit, onDuplicate, onDelete, onClose, docked }) => {
  const calendars = useCalendars();
  const classNames = useClassNames();
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const calendar = calendars?.find((c) => c.id === event.calendarId);
  const [day, times] = when(event, timezone, locale, t);

  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  useDialogFocus(ref);
  // Measured once laid out, so a tall card moves up instead of leaving the window.
  useIsomorphicLayoutEffect(() => setHeight(ref.current?.offsetHeight ?? 0), [event]);

  const viewport = { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
  const place = anchor
    ? placeBeside(anchor, { width: Math.min(WIDTH, window.innerWidth - 2 * MARGIN), height }, viewport)
    : { left: Math.max(MARGIN, (window.innerWidth - WIDTH) / 2), top: 80 };
  const action = "ck:inline-flex ck:items-center ck:gap-1.5 ck:min-h-9 ck:px-3 ck:rounded-lg ck:text-sm ck:font-semibold ck:transition-colors";

  return (
    <>
      <div data-ck-backdrop className={docked ? "ck:absolute ck:inset-0 ck:z-40 ck:bg-black/20 ck:animate-fade-in" : "ck:fixed ck:inset-0 ck:z-40"} onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-ck-docked={docked || undefined}
        className={docked ? cx("ck:absolute ck:inset-x-0 ck:bottom-0 ck:z-50 ck:max-h-[85%] ck:overflow-y-auto ck:rounded-t-3xl ck:border-t ck:border-border ck:bg-background ck:p-5 ck:shadow-[0_-20px_50px_-20px_rgb(0_0_0/0.4)] ck:outline-none ck:animate-rise-in", classNames.dialog) : cx("ck:fixed ck:z-50 ck:flex ck:flex-col ck:overflow-y-auto ck:rounded-2xl ck:border ck:border-border ck:bg-background ck:p-4 ck:shadow-[0_18px_40px_-16px_rgb(0_0_0/0.35),0_2px_6px_-2px_rgb(0_0_0/0.12)] ck:outline-none ck:animate-pop-in", classNames.dialog)}
        style={docked ? undefined : { ...place, width: WIDTH, maxWidth: `calc(100vw - ${2 * MARGIN}px)`, maxHeight: window.innerHeight - 2 * MARGIN }}
      >
        <div className="ck:flex ck:items-start ck:gap-3">
          <span className="ck-dot ck:mt-2 ck:w-3 ck:h-3 ck:rounded-[4px] ck:shrink-0" style={eventColorStyle(resolveEventColor(event, calendars))} aria-hidden="true" />
          <h2 id={titleId} className="ck:flex-1 ck:min-w-0 ck:font-display ck:text-xl ck:font-semibold ck:leading-snug ck:text-foreground ck:break-words ck:text-balance">{event.title || t.noTitle}</h2>
          <button type="button" onClick={onClose} aria-label={t.close} className="ck:-mr-1.5 ck:-mt-0.5 ck:inline-flex ck:w-8 ck:h-8 ck:items-center ck:justify-center ck:rounded-lg ck:text-muted-foreground ck:hover:bg-muted ck:hover:text-foreground">
            <X className="ck:w-4 ck:h-4" aria-hidden="true" />
          </button>
        </div>
        <div className="ck:mt-2">
          <Row icon={Clock}>
            <p className="ck:text-foreground ck:font-medium ck:first-letter:uppercase">{day}</p>
            {times && <p className="ck:tabular-nums">{times}</p>}
          </Row>
          {event.place ? (
            <Row icon={MapPin}>
              <p className="ck:text-foreground ck:font-medium ck:break-words">{event.place.name}</p>
              {event.place.address && <p className="ck:break-words">{event.place.address}</p>}
              <div className="ck:mt-1 ck:flex ck:flex-wrap ck:gap-x-4">
                <a href={mapsUrl(event.place)} target="_blank" rel="noopener noreferrer" className="ck:inline-flex ck:items-center ck:gap-1.5 ck:font-semibold ck:text-foreground ck:underline ck:decoration-border ck:underline-offset-4 ck:hover:decoration-foreground"><MapPin className="ck:h-3.5 ck:w-3.5" aria-hidden="true" />{t.openInMaps}</a>
                <a href={directionsUrl(event.place)} target="_blank" rel="noopener noreferrer" className="ck:inline-flex ck:items-center ck:gap-1.5 ck:font-semibold ck:text-foreground ck:underline ck:decoration-border ck:underline-offset-4 ck:hover:decoration-foreground"><Navigation className="ck:h-3.5 ck:w-3.5" aria-hidden="true" />{t.directions}</a>
              </div>
            </Row>
          ) : event.location && (
            <Row icon={MapPin}>
              <a href={mapsUrl(event.location)} target="_blank" rel="noopener noreferrer" title={t.openInMaps} className="ck:text-foreground ck:break-words ck:underline ck:decoration-border ck:underline-offset-4 ck:hover:decoration-foreground">{event.location}</a>
            </Row>
          )}
          {event.guests && event.guests.length > 0 && (
            <Row icon={Users} label={t.guests}>
              <ul>{event.guests.map((guest, i) => <li key={`${guest}-${i}`} className="ck:truncate" title={guest}>{guest}</li>)}</ul>
            </Row>
          )}
          {event.reminders && event.reminders.length > 0 && (
            <Row icon={Bell} label={t.reminders}>
              {/* Labels come from the minutes, in the calendar's language (a stored label may be in another). */}
              <ul>{event.reminders.map((reminder) => <li key={reminder.id}>{reminderLabel(reminder.time, t)}</li>)}</ul>
            </Row>
          )}
          {calendar && (
            <Row icon={Calendar} label={t.calendar}>
              <span className="ck:text-foreground">{calendar.label}</span>
            </Row>
          )}
          {event.attachments && event.attachments.length > 0 && (
            <Row icon={Paperclip} label={t.attachments}>
              {/* Only real, safe URLs are links (no `javascript:`, no generated placeholder file). */}
              <ul>
                {event.attachments.map((att) => (
                  <li key={att.id} className="ck:truncate">
                    {att.url && isSafeUrl(att.url)
                      ? <a href={att.url} target="_blank" rel="noopener noreferrer" download={att.name} className="ck:text-foreground ck:underline ck:decoration-border ck:underline-offset-4 ck:hover:decoration-foreground">{att.name}</a>
                      : <span>{att.name}</span>}
                  </li>
                ))}
              </ul>
            </Row>
          )}
          {event.description && (
            <Row icon={AlignLeft} label={t.description}>
              <p className="ck:text-foreground ck:line-clamp-4 ck:whitespace-pre-line">{event.description}</p>
            </Row>
          )}
        </div>
        <div className="ck:mt-3 ck:pt-3 ck:border-t ck:border-border ck:flex ck:flex-wrap ck:items-center ck:gap-1.5">
          <button type="button" onClick={onEdit} className={cx(action, "ck:bg-muted ck:text-foreground ck:hover:bg-accent")}>
            <Edit2 className="ck:w-4 ck:h-4" aria-hidden="true" />{t.edit}
          </button>
          <button type="button" onClick={onDuplicate} className={cx(action, "ck:bg-muted ck:text-foreground ck:hover:bg-accent")}>
            <Copy className="ck:w-4 ck:h-4" aria-hidden="true" />{t.duplicate}
          </button>
          <button type="button" onClick={onDelete} className={cx(action, "ck:ml-auto ck:text-destructive ck:hover:bg-destructive/10")}>
            <Trash2 className="ck:w-4 ck:h-4" aria-hidden="true" />{t.delete}
          </button>
        </div>
      </div>
    </>
  );
};
