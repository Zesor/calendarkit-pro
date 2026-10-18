import React, { useRef } from 'react';
import { format, startOfDay, differenceInMinutes, Locale } from 'date-fns';
import { CalendarEvent, CalendarTranslations, Resource } from '../types';
import { interpolate, timeFormats } from '../core/format';
import { isSameDisplayDay, toDisplay } from '../core/timezone';
import { DraggableEvent } from '../components/dnd/DraggableEvent';
import { DroppableCell } from '../components/dnd/DroppableCell';
import { eventColorStyle, resolveEventColor, useCalendars } from '../components/eventColor';

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
  onEventContextMenu
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const calendars = useCalendars();
  
  // Define timeline: 8am to 8pm for example (or full 24h)
  // Let's do 24h for flexibility, but maybe scroll to 8am
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const hourWidth = 100; // px per hour

  const timeFormat = timeFormats(locale).hour;

  // Positions use display (wall-clock) times so the timeline matches the chosen zone (T1).
  const getEventStyle = (event: CalendarEvent) => {
    const start = toDisplay(event.start, timezone);
    const end = toDisplay(event.end, timezone);
    const dayStart = startOfDay(currentDate);
    
    // Calculate minutes from start of day
    const startMinutes = differenceInMinutes(start, dayStart);
    const durationMinutes = differenceInMinutes(end, start);
    
    const left = (startMinutes / 60) * hourWidth;
    const width = (durationMinutes / 60) * hourWidth;
    
    return {
      left: `${left}px`,
      width: `${Math.max(width, 4)}px`, // Min width for visibility
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
                    isSameDisplayDay(e.start, currentDate, timezone)
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
                                    {[0, 15, 30, 45].map(minute => {
                                        const slotDate = new Date(currentDate);
                                        slotDate.setHours(hour, minute, 0, 0);
                                        const slotId = `${resource.id}-${slotDate.toISOString()}`;

                                        return (
                                            <DroppableCell
                                                key={minute}
                                                id={slotId}
                                                date={slotDate}
                                                resourceId={resource.id}
                                                className="ck:h-full ck:flex-1 ck:border-r ck:border-border/10 ck:last:border-border/30 ck:transition-colors"
                                                onSlotClick={onTimeSlotClick}
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
                                    className="ck-event ck:absolute ck:top-2 ck:bottom-2 ck:rounded-md ck:px-2 ck:py-1 ck:text-xs ck:font-semibold ck:cursor-pointer ck:overflow-hidden ck:hover:brightness-95 ck:transition-all ck:z-10"
                                    style={{
                                        ...getEventStyle(event),
                                        ...eventColorStyle(resolveEventColor(event, calendars, resource.color)),
                                    }}
                                >
                                    <div className="ck:truncate">{event.title}</div>
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
