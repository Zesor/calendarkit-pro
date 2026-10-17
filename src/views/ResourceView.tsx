import React, { useRef } from 'react';
import { format, addHours, startOfDay, differenceInMinutes, isSameDay } from 'date-fns';
import { CalendarEvent, Resource } from '../types';
import { cn } from '../utils';
import { uses24HourClock } from '../lib/date';
import { Locale } from 'date-fns';
import { DraggableEvent } from '../components/dnd/DraggableEvent';
import { DroppableCell } from '../components/dnd/DroppableCell';

interface ResourceViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  resources: Resource[];
  onEventClick?: (event: CalendarEvent) => void;
  onTimeSlotClick?: (date: Date, resourceId: string) => void;
  locale?: Locale;
}

export const ResourceView: React.FC<ResourceViewProps> = ({
  currentDate,
  events,
  resources,
  onEventClick,
  onTimeSlotClick,
  locale
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Define timeline: 8am to 8pm for example (or full 24h)
  // Let's do 24h for flexibility, but maybe scroll to 8am
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const hourWidth = 100; // px per hour

  const timeFormat = uses24HourClock(locale) ? 'H:mm' : 'h a';

  const getEventStyle = (event: CalendarEvent) => {
    const start = new Date(event.start);
    const end = new Date(event.end);
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
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header: Hours */}
      <div className="flex border-b border-border bg-muted/20">
        <div className="w-48 shrink-0 border-r border-border p-4 font-semibold text-sm bg-background sticky left-0 z-20">
          Resources
        </div>
        <div className="flex overflow-hidden">
             <div className="flex relative" style={{ width: hours.length * hourWidth }}>
                {hours.map(hour => (
                    <div 
                        key={hour} 
                        className="border-r border-border/50 text-xs text-muted-foreground p-2 font-medium shrink-0"
                        style={{ width: hourWidth }}
                    >
                        {format(new Date().setHours(hour, 0, 0, 0), timeFormat, { locale })}
                    </div>
                ))}
             </div>
        </div>
      </div>

      {/* Body: Resources & Events */}
      <div className="flex-1 overflow-auto relative" ref={containerRef}>
         <div className="min-w-fit">
            {resources.map(resource => {
                const resourceEvents = events.filter(e => 
                    e.resourceId === resource.id && 
                    isSameDay(new Date(e.start), currentDate)
                );

                return (
                    <div key={resource.id} className="flex border-b border-border min-h-[100px]">
                        {/* Resource Label Column */}
                        <div className="w-48 shrink-0 border-r border-border p-4 bg-background sticky left-0 z-10 flex items-center gap-3">
                            {resource.avatar ? (
                                <img src={resource.avatar} alt={resource.label} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                    {resource.label.substring(0, 2).toUpperCase()}
                                </div>
                            )}
                            <div className="flex flex-col">
                                <span className="text-sm font-medium">{resource.label}</span>
                                <span className="text-xs text-muted-foreground">ID: {resource.id}</span>
                            </div>
                        </div>

                        {/* Timeline Row */}
                        <div className="relative flex" style={{ width: hours.length * hourWidth }}>
                            {/* Grid Lines */}
                            {hours.map(hour => (
                                <div 
                                    key={hour}
                                    className="flex h-full shrink-0"
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
                                                className="h-full flex-1 border-r border-border/10 last:border-border/30 hover:bg-accent/10 transition-colors"
                                                onClick={() => {
                                                    onTimeSlotClick?.(slotDate, resource.id);
                                                }}
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
                                    className="absolute top-2 bottom-2 rounded-md px-2 py-1 text-xs font-medium border shadow-sm cursor-pointer overflow-hidden hover:brightness-95 transition-all z-10"
                                    style={{
                                        ...getEventStyle(event),
                                        backgroundColor: event.color || resource.color || 'var(--primary)',
                                        borderColor: 'rgba(0,0,0,0.1)',
                                        color: '#fff'
                                    }}
                                >
                                    <div className="truncate">{event.title}</div>
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
