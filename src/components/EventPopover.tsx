import React, { useEffect, useId, useRef } from 'react';
import { addDays, format, isSameDay, Locale } from 'date-fns';
import { CalendarEvent, CalendarTranslations } from '../types';
import { timeFormats } from '../core/format';
import { toDisplay } from '../core/timezone';
import { cx } from '../utils';
import { Copy, Edit2, MapPin, Paperclip, Trash2, Users, X } from './icons';
import { isSafeUrl, mapsUrl } from './links';
import { eventColorStyle, resolveEventColor, useCalendars } from './eventColor';
import { useClassNames } from './customize';

const WIDTH = 320;
const GAP = 8;

interface EventPopoverProps {
  event: CalendarEvent;
  /** Where the pointer was (viewport coordinates); centred near the top without one. */
  anchor: { x: number; y: number } | null;
  timezone?: string;
  locale?: Locale;
  translations: CalendarTranslations;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
}

/** The event's real dates in the display zone: one day, a span of days, or a timed range. */
function when(event: CalendarEvent, timezone: string | undefined, locale: Locale | undefined, allDayLabel: string) {
  const day = 'EEE d MMM';
  const start = toDisplay(event.start, timezone);
  const end = toDisplay(event.end, timezone);
  if (event.allDay) {
    // All-day ends are exclusive (midnight after the last day).
    const last = addDays(end, -1);
    return isSameDay(start, last) || last < start
      ? `${format(start, day, { locale })} · ${allDayLabel}`
      : `${format(start, day, { locale })} – ${format(last, day, { locale })}`;
  }
  const time = timeFormats(locale).time;
  return isSameDay(start, end)
    ? `${format(start, day, { locale })}, ${format(start, time, { locale })} – ${format(end, time, { locale })}`
    : `${format(start, `${day}, ${time}`, { locale })} – ${format(end, `${day}, ${time}`, { locale })}`;
}

export const EventPopover: React.FC<EventPopoverProps> = ({ event, anchor, timezone, locale, translations: t, onEdit, onDuplicate, onDelete, onClose }) => {
  const calendars = useCalendars();
  const classNames = useClassNames();
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const calendar = calendars?.find((c) => c.id === event.calendarId);

  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Next to the pointer, inside the window: below it in the top half, above it in the bottom half.
  const left = anchor ? Math.max(GAP, Math.min(anchor.x + GAP, window.innerWidth - WIDTH - GAP)) : Math.max(GAP, (window.innerWidth - WIDTH) / 2);
  const vertical = !anchor ? { top: 80 } : anchor.y < window.innerHeight / 2 ? { top: anchor.y + GAP } : { bottom: window.innerHeight - anchor.y + GAP };
  const action = "ck:flex ck:items-center ck:gap-1.5 ck:px-3 ck:py-1.5 ck:rounded-lg ck:text-sm ck:font-medium ck:transition-colors";

  return (
    <>
      <div data-ck-backdrop className="ck:fixed ck:inset-0 ck:z-40" onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx("ck:fixed ck:z-50 ck:flex ck:flex-col ck:gap-3 ck:max-h-[70vh] ck:overflow-y-auto ck:rounded-2xl ck:border ck:border-border ck:bg-background ck:p-4 ck:shadow-xl ck:outline-none ck:animate-pop-in", classNames.dialog)}
        style={{ left, width: WIDTH, maxWidth: `calc(100vw - ${2 * GAP}px)`, ...vertical }}
      >
        <div className="ck:flex ck:items-start ck:gap-2">
          <span className="ck-dot ck:mt-1.5 ck:w-3 ck:h-3 ck:rounded-[4px] ck:shrink-0" style={eventColorStyle(resolveEventColor(event, calendars))} aria-hidden="true" />
          <h2 id={titleId} className="ck:flex-1 ck:min-w-0 ck:text-base ck:font-semibold ck:text-foreground ck:break-words">{event.title || t.noTitle}</h2>
          <button type="button" onClick={onClose} aria-label={t.close} className="ck:-m-1 ck:p-1 ck:rounded-lg ck:text-muted-foreground ck:hover:bg-muted ck:hover:text-foreground">
            <X className="ck:w-4 ck:h-4" aria-hidden="true" />
          </button>
        </div>
        <p className="ck:text-sm ck:text-foreground ck:tabular-nums">{when(event, timezone, locale, t.allDay)}</p>
        {calendar && <p className="ck:text-sm ck:text-muted-foreground">{calendar.label}</p>}
        {event.location && (
          <a href={mapsUrl(event.location)} target="_blank" rel="noopener noreferrer" title={t.openInMaps} className="ck:flex ck:items-start ck:gap-2 ck:text-sm ck:text-foreground ck:underline-offset-2 ck:hover:underline">
            <MapPin className="ck:w-4 ck:h-4 ck:mt-0.5 ck:shrink-0 ck:text-muted-foreground" aria-hidden="true" />
            <span className="ck:min-w-0 ck:break-words">{event.location}</span>
          </a>
        )}
        {event.guests && event.guests.length > 0 && (
          <div className="ck:flex ck:items-start ck:gap-2 ck:text-sm ck:text-muted-foreground">
            <Users className="ck:w-4 ck:h-4 ck:mt-0.5 ck:shrink-0" aria-label={t.guests} />
            <ul className="ck:min-w-0">
              {event.guests.map((guest) => <li key={guest} className="ck:truncate">{guest}</li>)}
            </ul>
          </div>
        )}
        {event.attachments && event.attachments.length > 0 && (
          <div className="ck:flex ck:items-start ck:gap-2 ck:text-sm">
            <Paperclip className="ck:w-4 ck:h-4 ck:mt-0.5 ck:shrink-0 ck:text-muted-foreground" aria-label={t.attachments} />
            <ul className="ck:min-w-0">
              {/* Only real, safe URLs are links (no `javascript:`, no generated placeholder file). */}
              {event.attachments.map((att) => (
                <li key={att.id} className="ck:truncate">
                  {att.url && isSafeUrl(att.url)
                    ? <a href={att.url} target="_blank" rel="noopener noreferrer" download={att.name} className="ck:text-foreground ck:underline ck:underline-offset-2">{att.name}</a>
                    : <span className="ck:text-muted-foreground">{att.name}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
        {event.description && <p className="ck:text-sm ck:text-muted-foreground ck:line-clamp-3 ck:whitespace-pre-line">{event.description}</p>}
        <div className="ck:flex ck:items-center ck:gap-1 ck:pt-1">
          <button type="button" onClick={onEdit} className={cx(action, "ck:bg-primary ck:text-primary-foreground ck:hover:bg-primary/90")}>
            <Edit2 className="ck:w-4 ck:h-4" aria-hidden="true" />{t.edit}
          </button>
          <button type="button" onClick={onDuplicate} className={cx(action, "ck:text-foreground ck:hover:bg-muted")}>
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
