import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { format, Locale } from 'date-fns';
import { CalendarEvent, CalendarProps, CalendarTranslations } from '../types';
import { cx } from '../utils';
import { useClassNames } from './customize';
import { interpolate, timeFormats } from '../core/format';
import type { Draft } from '../core/store';
import { toDisplay } from '../core/timezone';
import { Clock, Sparkles } from './icons';
import { eventColorStyle } from './eventColor';
import { placeBeside } from './placement';
import { DiscardPrompt } from './DiscardPrompt';

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

/**
 * Quick create (spec §8.5): a compact card beside the new event drawn in the grid. The title is a
 * sentence the engine understands ("Lunch with Lea tomorrow 1pm"); Enter saves, Escape or a click
 * outside closes, and asks first when something was typed.
 */
export const QuickCreate: React.FC<QuickCreateProps> = ({ draft, events, calendars, timezone, locale, translations: t, onChange, onSave, onMoreOptions, onClose }) => {
  const [confirming, setConfirming] = useState(false);
  const classNames = useClassNames();
  const card = useRef<HTMLDivElement>(null);
  // Beside the ghost where the card opened (it stays there while a sentence moves the event);
  // centred near the top without a ghost (all day).
  const [place, setPlace] = useState<{ left: number; top: number } | null>(null);
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

  useLayoutEffect(() => {
    const el = card.current;
    const ghostEl = el?.closest('.ck-root')?.querySelector('[data-ck-ghost]');
    // Opened from "Create", the ghost may be outside the scrolled grid: bring it into view first.
    ghostEl?.scrollIntoView?.({ block: 'nearest' });
    const ghost = ghostEl?.getBoundingClientRect();
    const layer = el?.parentElement?.getBoundingClientRect();
    setPlace(el && ghost && layer && ghost.width > 0 ? placeBeside(ghost, { width: el.offsetWidth, height: el.offsetHeight }, layer) : null);
  }, []);

  const formats = timeFormats(locale);
  const day = format(draft.start, 'EEE d MMM', { locale });
  const when = draft.allDay ? `${day} · ${t.allDay}` : `${day} · ${format(draft.start, formats.time, { locale })} – ${format(draft.end, formats.time, { locale })}`;
  const overlap = draft.allDay ? undefined : events.find((event) => !event.allDay && toDisplay(event.start, timezone) < draft.end && toDisplay(event.end, timezone) > draft.start);
  const calendarColor = calendars?.find((c) => c.id === draft.calendarId)?.color;

  return (
    <div data-ck-layer className="ck:absolute ck:inset-0 ck:z-40" onClick={dismiss}>
      <div
        ref={card}
        role="dialog"
        aria-modal="true"
        aria-label={t.newEvent}
        className={cx(
          "ck:absolute ck:w-[320px] ck:max-w-[calc(100%-1rem)] ck:flex ck:flex-col ck:gap-2.5 ck:rounded-2xl ck:border ck:border-border ck:bg-background ck:p-3.5 ck:shadow-[0_18px_40px_-16px_rgb(0_0_0/0.35),0_2px_6px_-2px_rgb(0_0_0/0.12)] ck:animate-pop-in",
          !place && "ck:left-1/2 ck:top-20 ck:-translate-x-1/2",
          classNames.dialog
        )}
        style={place ?? undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          aria-label={t.title}
          placeholder={t.sentenceHint}
          value={draft.title}
          autoComplete="off"
          className="ck:w-full ck:bg-transparent ck:border-b-2 ck:border-border ck:focus:border-ring ck:outline-hidden ck:px-0.5 ck:py-1 ck:font-display ck:text-lg ck:font-semibold ck:text-foreground ck:placeholder:text-muted-foreground ck:placeholder:font-normal ck:placeholder:text-base"
          onChange={(e) => onChange({ title: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) onSave();
          }}
        />
        {draft.tokens.length > 0 && (
          <p aria-live="polite" className="ck:flex ck:flex-wrap ck:items-center ck:gap-1.5 ck:text-xs ck:text-muted-foreground">
            <Sparkles className="ck:w-3.5 ck:h-3.5 ck:shrink-0" aria-hidden="true" />
            {t.understood}
            {draft.tokens.map((token, i) => (
              <mark key={i} className="ck:rounded-md ck:bg-primary/10 ck:px-1.5 ck:py-px ck:font-semibold ck:text-foreground">{token.text}</mark>
            ))}
            <span>· {interpolate(t.savedAs, { title: draft.savedTitle || t.noTitle })}</span>
          </p>
        )}
        {/* When, and the calendar beside it: one line. */}
        <div className="ck:flex ck:flex-wrap ck:items-center ck:gap-x-3 ck:gap-y-2 ck:text-sm ck:text-foreground">
          <span className="ck:flex ck:items-center ck:gap-2 ck:font-semibold ck:tabular-nums">
            <Clock className="ck:w-4 ck:h-4 ck:text-muted-foreground" aria-hidden="true" />
            {when}
          </span>
          {calendars && calendars.length > 0 && (
            <span className="ck:relative ck:ml-auto">
              <span className="ck-dot ck:pointer-events-none ck:absolute ck:left-2.5 ck:top-1/2 ck:-translate-y-1/2 ck:w-2 ck:h-2 ck:rounded-[3px]" style={eventColorStyle(calendarColor)} aria-hidden="true" />
              <select
                aria-label={t.calendar}
                value={draft.calendarId ?? ''}
                className="ck:min-h-8 ck:max-w-36 ck:appearance-none ck:rounded-full ck:bg-muted ck:pl-6 ck:pr-3 ck:text-xs ck:font-semibold ck:text-foreground ck:hover:bg-accent ck:focus:outline-2 ck:focus:outline-ring"
                onChange={(e) => onChange({ calendarId: e.target.value || undefined })}
              >
                <option value="">{t.calendar}</option>
                {calendars.map((calendar) => (
                  <option key={calendar.id} value={calendar.id}>{calendar.label}</option>
                ))}
              </select>
            </span>
          )}
        </div>
        {overlap && <p role="status" className="ck:rounded-lg ck:bg-warning/10 ck:px-2.5 ck:py-1.5 ck:text-xs ck:font-medium ck:text-warning">{interpolate(t.overlaps, { title: overlap.title })}</p>}
        {confirming ? (
          <DiscardPrompt translations={t} onKeep={() => setConfirming(false)} onDiscard={onClose} />
        ) : (
          // No Cancel: Escape or a click outside closes (and asks first when something was typed).
          <div className="ck:flex ck:items-center ck:gap-2">
            <button type="button" className="ck:min-h-9 ck:text-sm ck:font-semibold ck:text-muted-foreground ck:hover:text-foreground ck:underline ck:underline-offset-4 ck:decoration-border ck:hover:decoration-foreground" onClick={onMoreOptions}>{t.moreOptions}</button>
            <span className="ck:flex-1" />
            <button type="button" className="ck:min-h-9 ck:rounded-lg ck:bg-primary ck:px-4 ck:text-sm ck:font-semibold ck:text-primary-foreground ck:hover:bg-primary/90" onClick={onSave}>{t.save}</button>
          </div>
        )}
      </div>
    </div>
  );
};
