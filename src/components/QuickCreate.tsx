import React, { useEffect, useState } from 'react';
import { addMinutes, differenceInMinutes, format, Locale } from 'date-fns';
import { CalendarEvent, CalendarProps, CalendarTranslations } from '../types';
import { cx } from '../utils';
import { interpolate, timeFormats } from '../core/format';
import type { Draft } from '../core/store';
import { toDisplay } from '../core/timezone';
import { Clock } from './icons';

type DraftPatch = Partial<Pick<Draft, 'title' | 'end' | 'calendarId'>>;

interface QuickCreateProps {
  draft: Draft;
  /** Visible events, to warn when the new one overlaps another. */
  events: CalendarEvent[];
  calendars?: CalendarProps['calendars'];
  timezone?: string;
  locale?: Locale;
  translations: CalendarTranslations;
  onChange: (patch: DraftPatch) => void;
  onSave: () => void;
  onMoreOptions: () => void;
  onClose: () => void;
}

const DURATIONS = [30, 60, 90, 120];

function durationLabel(minutes: number, t: CalendarTranslations) {
  if (minutes < 60) return interpolate(t.durationMinutes, { n: minutes });
  return minutes % 60 ? interpolate(t.durationHoursMinutes, { h: Math.floor(minutes / 60), m: minutes % 60 }) : interpolate(t.durationHours, { n: minutes / 60 });
}

/**
 * Quick create (spec §8.5): a compact card over the grid. The title is a sentence the engine
 * understands ("Lunch with Lea tomorrow 1pm"); Enter saves, Escape or a click outside closes, and
 * asks first when something was typed.
 */
export const QuickCreate: React.FC<QuickCreateProps> = ({ draft, events, calendars, timezone, locale, translations: t, onChange, onSave, onMoreOptions, onClose }) => {
  const [confirming, setConfirming] = useState(false);
  const dismiss = () => (draft.dirty ? setConfirming(true) : onClose());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (draft.dirty) setConfirming(true);
      else onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [draft.dirty, onClose]);

  const formats = timeFormats(locale);
  const day = format(draft.start, 'EEE d MMM', { locale });
  const when = draft.allDay ? `${day} · ${t.allDay}` : `${day} · ${format(draft.start, formats.time, { locale })} – ${format(draft.end, formats.time, { locale })}`;
  const minutes = differenceInMinutes(draft.end, draft.start);
  const understood = draft.tokens.length > 0
    ? `${t.understood} ${draft.tokens.map((token) => `“${token.text}”`).join(', ')} · ${interpolate(t.savedAs, { title: draft.savedTitle || t.noTitle })}`
    : draft.title ? '' : t.sentenceHint;
  const overlap = draft.allDay ? undefined : events.find((event) => !event.allDay && toDisplay(event.start, timezone) < draft.end && toDisplay(event.end, timezone) > draft.start);

  return (
    <div className="ck:absolute ck:inset-0 ck:z-40" onClick={dismiss}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.newEvent}
        className="ck:absolute ck:left-1/2 ck:top-20 ck:-translate-x-1/2 ck:w-[360px] ck:max-w-[calc(100%-2rem)] ck:flex ck:flex-col ck:gap-3 ck:rounded-2xl ck:border ck:border-border ck:bg-background ck:p-4 ck:shadow-xl ck:animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          aria-label={t.title}
          placeholder={t.eventTitle}
          value={draft.title}
          autoComplete="off"
          className="ck:w-full ck:bg-transparent ck:border-b-2 ck:border-border ck:focus:border-ring ck:outline-hidden ck:py-1 ck:text-lg ck:font-semibold ck:text-foreground"
          onChange={(e) => onChange({ title: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSave();
          }}
        />
        {understood && <p aria-live="polite" className="ck:text-xs ck:text-muted-foreground">{understood}</p>}
        <p className="ck:flex ck:items-center ck:gap-2 ck:text-sm ck:text-foreground ck:tabular-nums">
          <Clock className="ck:w-4 ck:h-4 ck:text-muted-foreground" />
          {when}
        </p>
        {!draft.allDay && (
          <div role="group" aria-label={t.duration} className="ck:flex ck:flex-wrap ck:gap-1.5">
            {DURATIONS.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={minutes === m}
                className={cx(
                  "ck:rounded-full ck:px-3 ck:py-1 ck:text-xs ck:font-semibold ck:transition-colors",
                  minutes === m ? "ck:bg-primary ck:text-primary-foreground" : "ck:bg-muted ck:text-foreground ck:hover:bg-accent"
                )}
                onClick={() => onChange({ end: addMinutes(draft.start, m) })}
              >
                {durationLabel(m, t)}
              </button>
            ))}
          </div>
        )}
        {calendars && calendars.length > 0 && (
          <select
            aria-label={t.calendar}
            value={draft.calendarId ?? ''}
            className="ck:rounded-lg ck:border ck:border-border ck:bg-background ck:px-2 ck:py-1.5 ck:text-sm ck:text-foreground"
            onChange={(e) => onChange({ calendarId: e.target.value || undefined })}
          >
            <option value="">{t.calendar}</option>
            {calendars.map((calendar) => (
              <option key={calendar.id} value={calendar.id}>{calendar.label}</option>
            ))}
          </select>
        )}
        {overlap && <p role="status" className="ck:text-xs ck:font-medium ck:text-warning">{interpolate(t.overlaps, { title: overlap.title })}</p>}
        {confirming ? (
          <div role="alertdialog" aria-label={t.discardChanges} className="ck:flex ck:items-center ck:gap-2 ck:border-t ck:border-border ck:pt-3">
            <span className="ck:flex-1 ck:text-sm ck:font-medium ck:text-foreground">{t.discardChanges}</span>
            <button type="button" autoFocus className="ck:rounded-lg ck:px-3 ck:py-1.5 ck:text-sm ck:font-semibold ck:hover:bg-muted" onClick={() => setConfirming(false)}>{t.keepEditing}</button>
            <button type="button" className="ck:rounded-lg ck:px-3 ck:py-1.5 ck:text-sm ck:font-semibold ck:text-destructive ck:hover:bg-destructive/10" onClick={onClose}>{t.discard}</button>
          </div>
        ) : (
          <div className="ck:flex ck:items-center ck:gap-2">
            <button type="button" className="ck:text-sm ck:font-semibold ck:text-foreground ck:underline ck:underline-offset-4 ck:decoration-border ck:hover:decoration-foreground" onClick={onMoreOptions}>{t.moreOptions}</button>
            <span className="ck:flex-1" />
            <button type="button" className="ck:rounded-lg ck:px-3 ck:py-1.5 ck:text-sm ck:font-semibold ck:hover:bg-muted" onClick={dismiss}>{t.cancel}</button>
            <button type="button" className="ck:rounded-lg ck:bg-primary ck:px-3 ck:py-1.5 ck:text-sm ck:font-semibold ck:text-primary-foreground ck:hover:bg-primary/90" onClick={onSave}>{t.save}</button>
          </div>
        )}
      </div>
    </div>
  );
};
