import React, { useCallback, useEffect, useState } from 'react';
import { format, Locale } from 'date-fns';
import { CalendarEvent, CalendarTranslations } from '../types';
import { cn } from '../utils';
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
    <div className="flex border-b-[0.5px] border-border/50 bg-background" data-all-day-row>
      <div className={cn("flex-none flex flex-col items-end justify-start gap-0.5 pr-2 pt-1 text-[10px] text-muted-foreground border-r-[0.5px] border-border/30", gutterClassName)}>
        <span>{translations?.allDay || 'All Day'}</span>
        {laneCount > maxLanes && (
          <button
            type="button"
            className="text-primary font-semibold hover:underline"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? translations?.showLess || 'Show less' : interpolate(translations?.moreEvents || '+{n} more', { n: hidden })}
          </button>
        )}
      </div>
      <div className="flex-1 relative" style={{ height }}>
        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
          {days.map((day, index) => (
            <DroppableCell
              key={day.toISOString()}
              id={`all-day-${day.toISOString()}`}
              date={day}
              allDayRow
              className={cn("h-full", index > 0 && "border-l-[0.5px] border-border/30")}
              onSlotClick={readonly || !onSlotClick ? undefined : handleSlotClick}
            />
          ))}
        </div>
        <div className="absolute inset-x-0 top-0 pointer-events-none" style={{ height }}>
          {segments.filter((segment) => segment.lane < visibleLanes).map((segment) => (
            <div key={`${segment.event.id}-${rowKey}`} className="pointer-events-auto">
              <AllDayBar
                segment={segment}
                rowDays={days}
                laneHeight={LANE_HEIGHT}
                timezone={timezone}
                locale={locale}
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
