import React from 'react';
import { format, Locale } from 'date-fns';
import { CalendarEvent } from '../types';
import { cx } from '../utils';
import { useClassNames } from './customize';
import { timeFormats } from '../core/format';
import { toDisplay } from '../core/timezone';
import { useEventColorStyle } from './eventColor';

/** How a block shows its event at a given size in px (spec §8.3). */
export interface BlockLayout {
  /** xs (< 22 px): the title on one line; sm (< 44 px): "Title · 9:00" on one line; lg: lines. */
  size: 'xs' | 'sm' | 'lg';
  /** Narrower than 92 px: no time, the title takes the room. */
  narrow: boolean;
  showTime: boolean;
  /** Lines the title may use (lg only). */
  titleLines: 1 | 2 | 3 | 4;
}

// Fixed class names so the stylesheet compiler finds them.
const CLAMP = { 1: 'ck:line-clamp-1', 2: 'ck:line-clamp-2', 3: 'ck:line-clamp-3', 4: 'ck:line-clamp-4' } as const;

/** `width` is unknown before the first measure (and in tests): the block is then treated as wide. */
export function blockLayout(height: number, width?: number): BlockLayout {
  const size = height < 22 ? 'xs' : height < 44 ? 'sm' : 'lg';
  const narrow = width !== undefined && width < 92;
  const lines = Math.max(1, Math.floor((height - 10) / 16) - (narrow ? 0 : 1));
  return {
    size,
    narrow,
    showTime: size === 'sm' ? width === undefined || width >= 130 : size === 'lg' && !narrow,
    titleLines: Math.min(lines, narrow ? 4 : 3) as BlockLayout['titleLines'],
  };
}

interface EventBlockProps {
  event: CalendarEvent;
  height: number;
  width?: number;
  timezone?: string;
  locale?: Locale;
  className?: string;
  /** Just created or moved: a brief outline draws the eye to it. */
  highlight?: boolean;
  onClick?: (event: CalendarEvent) => void;
  onContextMenu?: (event: CalendarEvent, e: React.MouseEvent) => void;
}

/** A timed event in the week or day grid: its colour, and as much text as its size allows. */
export const EventBlock: React.FC<EventBlockProps> = ({ event, height, width, timezone, locale, className, highlight, onClick, onContextMenu }) => {
  const colorStyle = useEventColorStyle(event);
  const classNames = useClassNames();
  const formats = timeFormats(locale);
  const start = format(toDisplay(event.start, timezone), formats.time, { locale });
  const end = format(toDisplay(event.end, timezone), formats.time, { locale });
  const layout = blockLayout(height, width);

  return (
    <div
      className={cx(
        "ck-event ck:h-full ck:w-full ck:rounded-md ck:overflow-hidden ck:text-xs ck:font-semibold ck:leading-tight ck:transition-[filter] ck:hover:drop-shadow-md",
        layout.size === 'lg' ? "ck:flex ck:flex-col ck:gap-px ck:py-1" : "ck:flex ck:items-center ck:gap-1.5",
        layout.narrow ? "ck:px-1.5" : "ck:px-2",
        highlight && "ck:animate-landed",
        className,
        classNames.event
      )}
      style={colorStyle}
      title={`${event.title}, ${start} – ${end}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(event);
      }}
      onContextMenu={onContextMenu ? (e) => onContextMenu(event, e) : undefined}
    >
      <span className={cx("ck:min-w-0", layout.size === 'lg' ? CLAMP[layout.titleLines] : "ck:truncate")}>{event.title}</span>
      {layout.showTime && (
        <span className="ck:shrink-0 ck:truncate ck:font-medium ck:opacity-90 ck:tabular-nums">
          {layout.size === 'sm' ? start : `${start} – ${end}`}
        </span>
      )}
    </div>
  );
};
