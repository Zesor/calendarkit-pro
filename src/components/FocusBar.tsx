import React from 'react';
import { format, Locale } from 'date-fns';
import type { CalendarTranslations, ViewType } from '../types';
import { cx } from '../utils';
import { ChevronLeft, ChevronRight, Plus } from './icons';
import { useClassNames } from './customize';

const VIEWS: ViewType[] = ['month', 'week', 'day', 'agenda'];

interface FocusBarProps {
  date: Date;
  view: ViewType;
  locale?: Locale;
  translations: CalendarTranslations;
  hideViewSwitcher?: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (view: ViewType) => void;
  /** Undefined in read-only mode. */
  onCreate?: () => void;
  /** Phone layout (spec §8.9): the views in a menu, 44 px targets. */
  compact?: boolean;
}

/** Focus layout (spec §8.1): one floating pill above the grid — period, navigation, views, Create. */
export const FocusBar: React.FC<FocusBarProps> = ({ date, view, locale, translations: t, hideViewSwitcher, onPrev, onNext, onToday, onViewChange, onCreate, compact }) => {
  const classNames = useClassNames();
  const icon = cx("ck:flex ck:items-center", compact ? "ck:min-h-11 ck:min-w-11" : "ck:h-9 ck:w-9", "ck:items-center ck:justify-center ck:rounded-full ck:text-muted-foreground ck:hover:bg-muted ck:hover:text-foreground");
  // A pill above the grid, centred, in the normal flow: it never covers the day header, however narrow.
  return (
    <div className="ck:flex ck:justify-center ck:px-2 ck:pt-3 ck:pb-2">
    <div
      role="toolbar"
      aria-label={t.navigationLabel}
      className={cx("ck:flex ck:flex-wrap ck:items-center ck:justify-center ck:gap-1 ck:rounded-3xl ck:border ck:border-border ck:bg-background ck:py-1.5 ck:pl-4 ck:pr-1.5 ck:shadow-[0_10px_24px_-12px_rgb(0_0_0/0.35),0_1px_3px_rgb(0_0_0/0.08)]", classNames.toolbar)}
    >
      <h2 className="ck:mr-1 ck:whitespace-nowrap ck:font-display ck:text-base ck:font-semibold ck:text-foreground ck:first-letter:uppercase">{format(date, 'MMMM yyyy', { locale })}</h2>
      <button type="button" onClick={onToday} className={cx(compact ? "ck:min-h-11" : "ck:min-h-9", "ck:rounded-full ck:px-3 ck:text-sm ck:font-semibold ck:text-foreground ck:hover:bg-muted")}>{t.today}</button>
      <button type="button" onClick={onPrev} aria-label={t.previous} className={icon}><ChevronLeft className="ck:h-4 ck:w-4" aria-hidden="true" /></button>
      <button type="button" onClick={onNext} aria-label={t.next} className={icon}><ChevronRight className="ck:h-4 ck:w-4" aria-hidden="true" /></button>
      {!hideViewSwitcher && compact && (
        <select aria-label={t.viewLabel} value={view} onChange={(e) => onViewChange(e.target.value as ViewType)} className="ck:mx-1 ck:min-h-11 ck:rounded-full ck:bg-muted ck:px-3 ck:text-sm ck:font-semibold ck:text-foreground">
          {VIEWS.map((v) => <option key={v} value={v}>{t[v]}</option>)}
        </select>
      )}
      {!hideViewSwitcher && !compact && (
        <span className="ck:mx-1 ck:flex ck:rounded-full ck:bg-muted ck:p-0.5">
          {VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => onViewChange(v)}
              className={cx("ck:min-h-8 ck:rounded-full ck:px-3 ck:text-xs ck:font-semibold ck:transition-colors", view === v ? "ck:bg-background ck:text-foreground ck:shadow-sm" : "ck:text-muted-foreground ck:hover:text-foreground")}
            >
              {t[v]}
            </button>
          ))}
        </span>
      )}
      {onCreate && (
        <button type="button" onClick={onCreate} className={cx("ck:flex", compact ? "ck:min-h-11" : "ck:min-h-9", "ck:items-center ck:gap-1.5 ck:rounded-full ck:bg-primary ck:px-4 ck:text-sm ck:font-semibold ck:text-primary-foreground ck:hover:bg-primary/90")}>
          <Plus className="ck:h-4 ck:w-4" aria-hidden="true" />{t.create}
        </button>
      )}
    </div>
    </div>
  );
};
