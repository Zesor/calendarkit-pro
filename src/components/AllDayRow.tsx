import React, { useCallback, useEffect, useState } from 'react';
import { format, Locale } from 'date-fns';
import { CalendarEvent, CalendarTranslations } from '../types';
import { cx } from '../utils';
import { interpolate } from '../core/format';
import { layoutDayRow } from '../core/allDay';
import { DroppableCell } from './dnd/DroppableCell';
import { AllDayBar } from './AllDayBar';

interface AllDayRowProps {
  days: Date[];
  /** Events of the all-day row (see `partitionDayEvents`). */
  dayEvents: CalendarEvent[];
  timezone?: string;
  locale?: Locale;
  translations?: Partial<CalendarTranslations>;
  readonly?: boolean;
  /** Width class of the left gutter, aligned with the time axis of the grid. */
  gutterClassName: string;
  /** Lanes shown before "+N more". */
  maxLanes?: number;
  onEventClick?: (event: CalendarEvent) => void;
  onEventContextMenu?: (event: CalendarEvent, e: React.MouseEvent) => void;
  onDayEventResize?: (event: CalendarEvent, newLastDay: Date) => void;
  onSlotClick?: (day: Date) => void;
}

const LANE_HEIGHT = 22;

const AllDayRowImpl: React.FC<AllDayRowProps> = ({
  days,
  dayEvents,
  timezone,
  locale,
  translations,
  readonly,
  gutterClassName,
  maxLanes = 2,
  onEventClick,
  onEventContextMenu,
  onDayEventResize,
  onSlotClick,
}) => {
  const [expanded, setExpanded] = useState(false);
  const rowKey = days.length ? format(days[0], 'yyyy-MM-dd') : '';
  // A new week (or day) starts collapsed.
  useEffect(() => setExpanded(false), [rowKey]);

  // Day cells report (date, resourceId); creation only needs the day.
  const handleSlotClick = useCallback((day: Date) => onSlotClick?.(day), [onSlotClick]);

  const { segments, laneCount } = layoutDayRow(days, dayEvents, timezone);
  const visibleLanes = expanded ? laneCount : Math.min(laneCount, maxLanes);
  const hidden = segments.filter((segment) => segment.lane >= visibleLanes).length;
  const height = Math.max(visibleLanes, 1) * LANE_HEIGHT + 4;

  return (
    <div className="ck:flex ck:border-b-[0.5px] ck:border-border/50 ck:bg-background" data-all-day-row>
      <div className={cx("ck:flex-none ck:flex ck:flex-col ck:items-end ck:justify-start ck:gap-0.5 ck:pr-2 ck:pt-1 ck:text-[10px] ck:text-muted-foreground ck:border-r-[0.5px] ck:border-border/30", gutterClassName)}>
        <span>{translations?.allDay || 'All Day'}</span>
        {laneCount > maxLanes && (
          <button
            type="button"
            className="ck:text-primary ck:font-semibold ck:hover:underline"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? translations?.showLess || 'Show less' : interpolate(translations?.moreEvents || '+{n} more', { n: hidden })}
          </button>
        )}
      </div>
      <div className="ck:flex-1 ck:relative" style={{ height }}>
        <div className="ck:absolute ck:inset-0 ck:grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
          {days.map((day, index) => (
            <DroppableCell
              key={day.toISOString()}
              id={`all-day-${day.toISOString()}`}
              date={day}
              allDayRow
              className={cx("ck:h-full", index > 0 && "ck:border-l-[0.5px] ck:border-border/30")}
              onSlotClick={readonly || !onSlotClick ? undefined : handleSlotClick}
              label={interpolate(translations?.createAllDayOn ?? '{date}', { date: format(day, 'EEEE d MMMM', { locale }) })}
            />
          ))}
        </div>
        <div className="ck:absolute ck:inset-x-0 ck:top-0 ck:pointer-events-none" style={{ height }}>
          {segments.filter((segment) => segment.lane < visibleLanes).map((segment) => (
            <div key={`${segment.event.id}-${rowKey}`} className="ck:pointer-events-auto">
              <AllDayBar
                segment={segment}
                rowDays={days}
                laneHeight={LANE_HEIGHT}
                timezone={timezone}
                translations={translations}
                readonly={readonly}
                onEventClick={onEventClick}
                onEventContextMenu={onEventContextMenu}
                onDayEventResize={onDayEventResize}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const AllDayRow = React.memo(AllDayRowImpl);
