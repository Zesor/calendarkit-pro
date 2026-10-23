import React, { useEffect, useId, useRef, useState } from 'react';
import { addDays, format, Locale } from 'date-fns';
import { CalendarEvent, CalendarProps, CalendarTranslations, Place, PlaceSearch } from '../types';
import { cx } from '../utils';
import { useClassNames } from './customize';
import { interpolate, timeFormats } from '../core/format';
import type { Draft } from '../core/store';
import { toDisplay } from '../core/timezone';
import { AlignLeft, Calendar, Clock, MapPin, Sparkles, Users, X } from './icons';
import { eventColorStyle } from './eventColor';
import { placeBeside } from './placement';
import { useDialogFocus } from './useDialogFocus';
import { DiscardPrompt } from './DiscardPrompt';
import { PlaceField } from './PlaceField';
import { EMAIL } from './EventModal';
import { useIsomorphicLayoutEffect } from '../hooks/useIsomorphicLayoutEffect';

type DraftPatch = Partial<Pick<Draft, 'title' | 'start' | 'end' | 'calendarId'>>;

/** What the quick card adds to the draft: saved with it, or carried to "More options". */
export type QuickExtra = Partial<Pick<CalendarEvent, 'guests' | 'location' | 'place' | 'description'>>;

interface QuickCreateProps {
  /** Phone layout (spec §8.9): a bottom sheet over the calendar instead of a card beside the ghost. */
  docked?: boolean;
  draft: Draft;
  /** Visible events, to warn when the new one overlaps another. */
  events: CalendarEvent[];
  calendars?: CalendarProps['calendars'];
  timezone?: string;
  locale?: Locale;
  translations: CalendarTranslations;
  placeSearch?: PlaceSearch;
  onChange: (patch: DraftPatch) => void;
  onSave: (extra: QuickExtra) => void;
  onMoreOptions: (extra: QuickExtra) => void;
  onClose: () => void;
}

/** `date` on another day (`yyyy-MM-dd`) or at another time (`HH:mm`), from a native input's value. */
const onDay = (date: Date, value: string) => {
  const [y, m, d] = value.split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d, date.getHours(), date.getMinutes()) : date;
};
const atTime = (date: Date, value: string) => {
  const [h, m] = value.split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m) : date;
};

/** A row of the card: an icon in the left column, its content beside it. */
const Row: React.FC<{ icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; children: React.ReactNode }> = ({ icon: Icon, children }) => (
  <div className="ck:flex ck:items-start ck:gap-4">
    <Icon className="ck:mt-2 ck:h-5 ck:w-5 ck:shrink-0 ck:text-muted-foreground" aria-hidden="true" />
    <div className="ck:min-w-0 ck:flex-1">{children}</div>
  </div>
);
const ADD = "ck:w-full ck:min-h-9 ck:rounded-lg ck:px-2 ck:-mx-2 ck:text-left ck:text-sm ck:text-muted-foreground ck:hover:bg-muted ck:hover:text-foreground ck:transition-colors";
const FIELD = "ck:w-full ck:min-h-9 ck:rounded-lg ck:border ck:border-transparent ck:bg-muted ck:px-3 ck:text-sm ck:text-foreground ck:placeholder:text-muted-foreground ck:focus:border-ring ck:focus:bg-background ck:focus:outline-hidden";
// A native date or time picker laid over its text: the text shows, a click opens the picker.
const PICK = "ck:absolute ck:inset-0 ck:h-full ck:w-full ck:cursor-pointer ck:opacity-0";
const open = (e: React.MouseEvent<HTMLInputElement>) => {
  try { e.currentTarget.showPicker?.(); } catch { /* not allowed here: the input still takes the keyboard */ }
};

/**
 * Quick create (spec §8.5): a compact card beside the new event drawn in the grid, laid out like the
 * quick event of the big calendars: a title (a sentence the engine understands), then one row each
 * for when (edited in place), guests, location, description and calendar. Enter saves; Escape, the
 * close button or a click outside closes, and asks first when something was typed.
 */
export const QuickCreate: React.FC<QuickCreateProps> = ({ draft, events, calendars, timezone, locale, translations: t, placeSearch, onChange, onSave, onMoreOptions, onClose, docked }) => {
  const [confirming, setConfirming] = useState(false);
  const classNames = useClassNames();
  const id = useId();
  const card = useRef<HTMLDivElement>(null);
  // Beside the ghost where the card opened (it stays there while a sentence moves the event);
  // centred near the top without a ghost (all day).
  const [place, setPlace] = useState<{ left: number; top: number } | null>(null);
  const [shown, setShown] = useState<{ guests?: boolean; location?: boolean; description?: boolean }>({});
  const [guests, setGuests] = useState('');
  const [guestError, setGuestError] = useState(false);
  const [where, setWhere] = useState<{ location: string; place?: Place }>({ location: '' });
  const [description, setDescription] = useState('');
  const dirty = draft.dirty || !!guests.trim() || !!where.location || !!description.trim();
  const dismiss = () => (dirty ? setConfirming(true) : onClose());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (dirty) setConfirming(true);
      else onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dirty, onClose]);

  useDialogFocus(card);

  useIsomorphicLayoutEffect(() => {
    const el = card.current;
    const ghostEl = el?.closest('.ck-root')?.querySelector('[data-ck-ghost]');
    // Opened from "Create", the ghost may be outside the scrolled grid: bring it into view first.
    ghostEl?.scrollIntoView?.({ block: 'nearest' });
    const ghost = ghostEl?.getBoundingClientRect();
    const layer = el?.parentElement?.getBoundingClientRect();
    setPlace(el && ghost && layer && ghost.width > 0 ? placeBeside(ghost, { width: el.offsetWidth, height: el.offsetHeight }, layer) : null);
  }, []);

  /** The added fields, or `undefined` when a guest is not a valid email (said under the field). */
  const extra = (): QuickExtra | undefined => {
    const entries = guests.split(/[\s,;]+/).filter(Boolean);
    if (entries.some((entry) => !EMAIL.test(entry))) {
      setGuestError(true);
      return undefined;
    }
    return {
      ...(entries.length ? { guests: [...new Set(entries)] } : {}),
      ...(where.location ? { location: where.location, ...(where.place ? { place: where.place } : {}) } : {}),
      ...(description.trim() ? { description: description.trim() } : {}),
    };
  };
  const save = () => {
    const fields = extra();
    if (fields) onSave(fields);
  };

  const formats = timeFormats(locale);
  const minutes = draft.end.getTime() - draft.start.getTime();
  const zone = timezone && new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'short' }).formatToParts(draft.start).find((p) => p.type === 'timeZoneName')?.value;
  const repeat = draft.recurrence ? { DAILY: t.daily, WEEKLY: t.weekly, MONTHLY: t.monthly, YEARLY: t.yearly }[draft.recurrence.freq] : t.doesNotRepeat;
  const overlap = draft.allDay ? undefined : events.find((event) => !event.allDay && toDisplay(event.start, timezone) < draft.end && toDisplay(event.end, timezone) > draft.start);
  const calendarColor = calendars?.find((c) => c.id === draft.calendarId)?.color;
  const timeText = "ck:relative ck:rounded-md ck:px-1 ck:-mx-1 ck:hover:bg-muted ck:focus-within:bg-muted ck:focus-within:outline-2 ck:focus-within:outline-ring";

  return (
    <div data-ck-layer className={cx("ck:absolute ck:inset-0 ck:z-40", docked && "ck:bg-black/20 ck:animate-fade-in")} onClick={dismiss}>
      <div
        ref={card}
        role="dialog"
        aria-modal="true"
        aria-label={t.newEvent}
        data-ck-docked={docked || undefined}
        className={docked ? cx("ck:absolute ck:inset-x-0 ck:bottom-0 ck:flex ck:max-h-[85%] ck:flex-col ck:gap-3 ck:overflow-y-auto ck:rounded-t-3xl ck:border-t ck:border-border ck:bg-background ck:px-5 ck:pt-3 ck:pb-5 ck:shadow-[0_-20px_50px_-20px_rgb(0_0_0/0.4)] ck:animate-rise-in", classNames.dialog) : cx(
          "ck:absolute ck:w-[440px] ck:max-w-[calc(100%-1rem)] ck:flex ck:flex-col ck:gap-3 ck:rounded-2xl ck:border ck:border-border ck:bg-background ck:px-5 ck:pt-3 ck:pb-4 ck:shadow-[0_24px_56px_-20px_rgb(0_0_0/0.4),0_2px_8px_-2px_rgb(0_0_0/0.12)] ck:animate-pop-in",
          !place && "ck:left-1/2 ck:top-20 ck:-translate-x-1/2",
          classNames.dialog
        )}
        style={docked ? undefined : place ?? undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ck:flex ck:justify-end">
          <button type="button" onClick={dismiss} aria-label={t.close} className="ck:-mr-2 ck:flex ck:h-8 ck:w-8 ck:items-center ck:justify-center ck:rounded-full ck:text-muted-foreground ck:hover:bg-muted ck:hover:text-foreground">
            <X className="ck:h-4 ck:w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="ck:pl-9">
          <input
            autoFocus
            aria-label={t.title}
            placeholder={t.title}
            value={draft.title}
            autoComplete="off"
            className="ck:w-full ck:bg-transparent ck:border-b-2 ck:border-border ck:focus:border-ring ck:outline-hidden ck:px-0.5 ck:pb-1.5 ck:font-display ck:text-2xl ck:text-foreground ck:placeholder:text-muted-foreground"
            onChange={(e) => onChange({ title: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) save();
            }}
          />
          {draft.tokens.length > 0 && (
            <p aria-live="polite" className="ck:mt-2 ck:flex ck:flex-wrap ck:items-center ck:gap-1.5 ck:text-xs ck:text-muted-foreground">
              <Sparkles className="ck:w-3.5 ck:h-3.5 ck:shrink-0" aria-hidden="true" />
              {t.understood}
              {draft.tokens.map((token, i) => (
                <mark key={i} className="ck:rounded-md ck:bg-primary/10 ck:px-1.5 ck:py-px ck:font-semibold ck:text-foreground">{token.text}</mark>
              ))}
              <span>· {interpolate(t.savedAs, { title: draft.savedTitle || t.noTitle })}</span>
            </p>
          )}
        </div>

        <Row icon={Clock}>
          <p className="ck:flex ck:flex-wrap ck:items-center ck:gap-x-2 ck:pt-1.5 ck:text-sm ck:text-foreground ck:tabular-nums">
            <span className={timeText}>
              {format(draft.start, 'EEEE, d MMMM', { locale })}
              <input type="date" aria-label={t.dateLabel} className={PICK} value={format(draft.start, 'yyyy-MM-dd')} onClick={open}
                onChange={(e) => {
                  const start = onDay(draft.start, e.target.value);
                  onChange({ start, end: new Date(start.getTime() + minutes) });
                }} />
            </span>
            {' '}
            {draft.allDay ? <span>{t.allDay}</span> : (
              <span className="ck:inline-flex ck:items-center ck:whitespace-pre">
                <span className={timeText}>
                  {format(draft.start, formats.time, { locale })}
                  <input type="time" step={900} aria-label={t.start} className={PICK} value={format(draft.start, 'HH:mm')} onClick={open}
                    onChange={(e) => {
                      const start = atTime(draft.start, e.target.value);
                      onChange({ start, end: new Date(start.getTime() + minutes) });
                    }} />
                </span>
                <span aria-hidden="true">{' – '}</span>
                <span className={timeText}>
                  {format(draft.end, formats.time, { locale })}
                  <input type="time" step={900} aria-label={t.end} className={PICK} value={format(draft.end, 'HH:mm')} onClick={open}
                    onChange={(e) => {
                      const end = atTime(draft.start, e.target.value);
                      // An end before the start is the next day (an evening running past midnight).
                      onChange({ end: end > draft.start ? end : addDays(end, 1) });
                    }} />
                </span>
              </span>
            )}
          </p>
          <p className="ck:mt-0.5 ck:text-xs ck:text-muted-foreground">{[zone, repeat].filter(Boolean).join(' · ')}</p>
          {overlap && <p role="status" className="ck:mt-2 ck:rounded-lg ck:bg-warning/10 ck:px-2.5 ck:py-1.5 ck:text-xs ck:font-medium ck:text-warning">{interpolate(t.overlaps, { title: overlap.title })}</p>}
        </Row>

        <Row icon={Users}>
          {shown.guests ? (
            <>
              <input autoFocus aria-label={t.guests} aria-invalid={guestError} inputMode="email" autoComplete="off" className={cx(FIELD, guestError && "ck:border-destructive")} placeholder={t.addGuestPlaceholder} value={guests}
                onChange={(e) => { setGuests(e.target.value); setGuestError(false); }} />
              {guestError && <p role="alert" className="ck:mt-1 ck:text-xs ck:text-destructive">{t.invalidEmail}</p>}
            </>
          ) : <button type="button" className={ADD} onClick={() => setShown((s) => ({ ...s, guests: true }))}>{t.addGuests}</button>}
        </Row>

        <Row icon={MapPin}>
          {shown.location ? (
            <>
              <label htmlFor={`${id}-location`} className="ck:sr-only">{t.locationLabel}</label>
              <PlaceField id={`${id}-location`} autoFocus value={where.location} place={where.place} search={placeSearch} className={FIELD} translations={t}
                onChange={(location, chosen) => setWhere({ location, place: chosen })} />
            </>
          ) : <button type="button" className={ADD} onClick={() => setShown((s) => ({ ...s, location: true }))}>{t.addLocation}</button>}
        </Row>

        <Row icon={AlignLeft}>
          {shown.description ? (
            <textarea autoFocus aria-label={t.description} rows={2} className={cx(FIELD, "ck:py-2 ck:resize-y")} placeholder={t.addNotes} value={description} onChange={(e) => setDescription(e.target.value)} />
          ) : <button type="button" className={ADD} onClick={() => setShown((s) => ({ ...s, description: true }))}>{t.addDescription}</button>}
        </Row>

        {calendars && calendars.length > 0 && (
          <Row icon={Calendar}>
            <span className="ck:relative ck:inline-flex">
              <span className="ck-dot ck:pointer-events-none ck:absolute ck:right-3 ck:top-1/2 ck:-translate-y-1/2 ck:w-2.5 ck:h-2.5 ck:rounded-full" style={eventColorStyle(calendarColor)} aria-hidden="true" />
              <select
                aria-label={t.calendar}
                value={draft.calendarId ?? ''}
                className="ck:min-h-9 ck:max-w-60 ck:appearance-none ck:rounded-lg ck:bg-transparent ck:-ml-2 ck:pl-2 ck:pr-8 ck:text-sm ck:text-foreground ck:hover:bg-muted ck:focus:outline-2 ck:focus:outline-ring"
                onChange={(e) => onChange({ calendarId: e.target.value || undefined })}
              >
                <option value="">{t.calendar}</option>
                {calendars.map((calendar) => (
                  <option key={calendar.id} value={calendar.id}>{calendar.label}</option>
                ))}
              </select>
            </span>
          </Row>
        )}

        {confirming ? (
          <DiscardPrompt translations={t} onKeep={() => setConfirming(false)} onDiscard={onClose} />
        ) : (
          <div className="ck:flex ck:items-center ck:justify-end ck:gap-2 ck:pt-1">
            <button type="button" className="ck:min-h-10 ck:rounded-full ck:px-4 ck:text-sm ck:font-semibold ck:text-foreground ck:hover:bg-muted" onClick={() => { const fields = extra(); if (fields) onMoreOptions(fields); }}>{t.moreOptions}</button>
            <button type="button" className="ck:min-h-10 ck:rounded-full ck:bg-primary ck:px-6 ck:text-sm ck:font-semibold ck:text-primary-foreground ck:hover:bg-primary/90" onClick={save}>{t.save}</button>
          </div>
        )}
      </div>
    </div>
  );
};
