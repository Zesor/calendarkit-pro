import React, { useRef } from 'react';
import { format, startOfDay, differenceInMinutes, Locale } from 'date-fns';
import { CalendarEvent, CalendarTranslations, Resource } from '../types';
import { interpolate, timeFormats } from '../core/format';
import { isSameDisplayDay, toDisplay } from '../core/timezone';
import { DraggableEvent } from '../components/dnd/DraggableEvent';
import { DroppableCell } from '../components/dnd/DroppableCell';
import { eventColorStyle, resolveEventColor, useCalendars } from '../components/eventColor';
import { useClassNames } from '../components/customize';
import { useEventLabel } from '../components/eventLabel';
import { cx } from '../utils';
import { DEFAULT_GRID, gridHours, gridSlots, slotDate, type TimeGrid } from './grid';

interface ResourceViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  resources: Resource[];
  onEventClick?: (event: CalendarEvent) => void;
  onTimeSlotClick?: (date: Date, resourceId?: string) => void;
  locale?: Locale;
  timezone?: string;
  translations?: Partial<CalendarTranslations>;
  onEventContextMenu?: (event: CalendarEvent, e: React.MouseEvent) => void;
  /** Visible hours and slots (`dayStartHour`, `dayEndHour`…). */
  grid?: TimeGrid;
}

export const ResourceView: React.FC<ResourceViewProps> = ({
  currentDate,
  events,
  resources,
  onEventClick,
  onTimeSlotClick,
  locale,
  timezone,
  translations,
  onEventContextMenu,
  grid = DEFAULT_GRID,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const calendars = useCalendars();
  const classNames = useClassNames();
  const labelEvent = useEventLabel();
  
  const hours = gridHours(grid);
  const hourWidth = 100; // px per hour

  const timeFormat = timeFormats(locale).hour;

  // Positions use display (wall-clock) times so the timeline matches the chosen zone (T1), cut at
  // the visible hours.
  const getEventStyle = (event: CalendarEvent) => {
    const dayStart = slotDate(startOfDay(currentDate), grid.startHour * 60);
    const startMinutes = Math.max(differenceInMinutes(toDisplay(event.start, timezone), dayStart), 0);
    const endMinutes = Math.min(differenceInMinutes(toDisplay(event.end, timezone), dayStart), hours.length * 60);
    return {
      left: `${(startMinutes / 60) * hourWidth}px`,
      width: `${Math.max(((endMinutes - startMinutes) / 60) * hourWidth, 4)}px`, // Min width for visibility
    };
  };

  return (
    <div className="ck:flex ck:flex-col ck:h-full ck:bg-background ck:overflow-hidden">
      {/* Header: Hours */}
      <div className="ck:flex ck:border-b ck:border-border ck:bg-muted/20">
        <div className="ck:w-48 ck:shrink-0 ck:border-r ck:border-border ck:p-4 ck:font-semibold ck:text-sm ck:bg-background ck:sticky ck:left-0 ck:z-20">
          {translations?.resource || 'Resources'}
        </div>
        <div className="ck:flex ck:overflow-hidden">
             <div className="ck:flex ck:relative" style={{ width: hours.length * hourWidth }}>
                {hours.map(hour => (
                    <div 
                        key={hour} 
                        className="ck:border-r ck:border-border/50 ck:text-xs ck:text-muted-foreground ck:p-2 ck:font-medium ck:shrink-0"
                        style={{ width: hourWidth }}
                    >
                        {format(new Date().setHours(hour, 0, 0, 0), timeFormat, { locale })}
                    </div>
                ))}
             </div>
        </div>
      </div>

      {/* Body: Resources & Events */}
      <div className="ck:flex-1 ck:overflow-auto ck:relative" ref={containerRef}>
         <div className="ck:min-w-fit">
            {resources.map(resource => {
                const resourceEvents = events.filter(e =>
                    e.resourceId === resource.id &&
                    isSameDisplayDay(e.start, currentDate, timezone) &&
                    toDisplay(e.end, timezone) > slotDate(currentDate, grid.startHour * 60) &&
                    toDisplay(e.start, timezone) < slotDate(currentDate, grid.endHour * 60)
                );

                return (
                    <div key={resource.id} className="ck:flex ck:border-b ck:border-border ck:min-h-[100px]">
                        {/* Resource Label Column */}
                        <div className="ck:w-48 ck:shrink-0 ck:border-r ck:border-border ck:p-4 ck:bg-background ck:sticky ck:left-0 ck:z-10 ck:flex ck:items-center ck:gap-3">
                            {resource.avatar ? (
                                <img src={resource.avatar} alt={resource.label} className="ck:w-8 ck:h-8 ck:rounded-full ck:object-cover" />
                            ) : (
                                <div className="ck:w-8 ck:h-8 ck:rounded-full ck:bg-primary/10 ck:flex ck:items-center ck:justify-center ck:text-xs ck:font-bold ck:text-primary">
                                    {resource.label.substring(0, 2).toUpperCase()}
                                </div>
                            )}
                            <div className="ck:flex ck:flex-col">
                                <span className="ck:text-sm ck:font-medium">{resource.label}</span>
                                <span className="ck:text-xs ck:text-muted-foreground">{interpolate(translations?.idLabel || 'ID: {id}', { id: resource.id })}</span>
                            </div>
                        </div>

                        {/* Timeline Row */}
                        <div className="ck:relative ck:flex" style={{ width: hours.length * hourWidth }}>
                            {/* Grid Lines */}
                            {hours.map(hour => (
                                <div 
                                    key={hour}
                                    className="ck:flex ck:h-full ck:shrink-0"
                                    style={{ width: hourWidth }}
                                >
                                    {gridSlots(grid).map(minute => {
                                        const date = slotDate(currentDate, hour * 60 + minute);
                                        const slotId = `${resource.id}-${date.toISOString()}`;

                                        return (
                                            <DroppableCell
                                                key={minute}
                                                id={slotId}
                                                date={date}
                                                resourceId={resource.id}
                                                className="ck:h-full ck:flex-1 ck:border-r ck:border-border/10 ck:last:border-border/30 ck:transition-colors"
                                                onSlotClick={onTimeSlotClick}
                                                label={onTimeSlotClick && `${interpolate(translations?.createAt ?? '{date} {time}', { date: format(date, 'EEEE d MMMM', { locale }), time: format(date, timeFormats(locale).time, { locale }) })}, ${resource.label}`}
                                                tabbable={minute === 0}
                                            />
                                        );
                                    })}
                                </div>
                            ))}

                            {/* Events */}
                            {resourceEvents.map(event => (
                                <DraggableEvent
                                    key={event.id}
                                    event={event}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEventClick?.(event);
                                    }}
                                    onContextMenu={onEventContextMenu ? (e) => onEventContextMenu(event, e) : undefined}
                                    data-ck-event-id={event.id}
                                    className={cx("ck-event ck:absolute ck:top-2 ck:bottom-2 ck:rounded-md ck:px-2 ck:py-1 ck:text-xs ck:font-semibold ck:cursor-pointer ck:overflow-hidden ck:hover:brightness-95 ck:transition-all ck:z-10", classNames.event)}
                                    style={{
                                        ...getEventStyle(event),
                                        ...eventColorStyle(resolveEventColor(event, calendars, resource.color)),
                                    }}
                                >
                                    <button type="button" aria-label={labelEvent(event)} className="ck:block ck:w-full ck:h-full ck:text-left ck:truncate">{event.title}</button>
                                </DraggableEvent>
                            ))}
                        </div>
                    </div>
                );
            })}
         </div>
      </div>
    </div>
  );
};
