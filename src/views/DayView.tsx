import React from 'react';
import { format, differenceInMinutes, isToday, isSameDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { CalendarEvent } from '../types';
import { cn } from '../utils';
import { uses24HourClock } from '../lib/date';
import { DraggableEvent } from '../components/dnd/DraggableEvent';
import { DroppableCell } from '../components/dnd/DroppableCell';
import { ResizableEvent } from '../components/dnd/ResizableEvent';
import { Locale } from 'date-fns';

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onTimeSlotClick?: (date: Date) => void;
  onEventResize?: (event: CalendarEvent, newEnd: Date) => void;
  timezone?: string;
  locale?: Locale;
  readonly?: boolean;
}

export const DayView: React.FC<DayViewProps> = ({
  currentDate,
  events,
  onEventClick,
  onTimeSlotClick,
  onEventResize,
  timezone,
  locale,
  readonly
}) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const hourHeight = 80; // Larger height for Day View
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const [now, setNow] = React.useState(new Date());

  React.useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to 8am on mount
  React.useEffect(() => {
    if (scrollContainerRef.current) {
        const scrollToActualTime = () => {
            const currentHour = now.getHours();
            const offsetHour = 3; // Scroll a bit above current hour
            return (currentHour - offsetHour) * hourHeight;
        }
      scrollContainerRef.current.scrollTop = scrollToActualTime();
    }
  }, []);

  // Timezone adjustment helper
  const getZonedDate = (date: Date) => {
    return timezone ? toZonedTime(date, timezone) : date;
  };

  const zonedNow = getZonedDate(now);

  // Filter events for the current day
  const dayEvents = events.filter(e => {
    const zonedStart = getZonedDate(e.start);
    return isSameDay(zonedStart, currentDate);
  });

  const is24h = uses24HourClock(locale);
  const timeFormat = is24h ? 'H:mm' : 'h a';
  const eventTimeFormat = is24h ? 'H:mm' : 'h:mm a';
  const nowFormat = is24h ? 'H:mm' : 'h:mm a';

  return (
    <div className="flex flex-col h-full bg-background border-[0.5px] border-border/50 rounded-2xl overflow-hidden shadow-sm">
        {/* Header */}
        <div className="px-6 py-4 border-b-[0.5px] border-border/50 bg-gradient-to-r from-muted/20 via-background to-muted/20 text-center shrink-0">
            <div className="flex items-center justify-center gap-3">
                <h2 className="text-xl font-semibold capitalize text-foreground">
                    {format(currentDate, 'EEEE, MMMM d, yyyy', { locale })}
                </h2>
                {isToday(currentDate) && (
                    <span className="text-xs font-semibold bg-primary text-primary-foreground px-3 py-1 rounded-full shadow-md shadow-primary/20">
                        Today
                    </span>
                )}
            </div>
        </div>

        {/* Grid */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative">
            <div className="flex relative" style={{ height: hours.length * hourHeight }}>
                {/* Time Labels */}
                <div className="w-20 bg-muted/5 border-r-[0.5px] border-border/30 relative">
                     {hours.map((hour) => (
                        <div
                            key={hour}
                            className="relative w-full"
                            style={{ height: hourHeight }}
                        >
                            {hour !== 0 && (
                                <span className="absolute w-full text-center -top-3 left-1/2 -translate-x-1/2 text-[11px] text-muted-foreground/80 font-medium tabular-nums bg-background px-1.5 py-0.5 rounded-md">
                                    {format(new Date().setHours(hour, 0, 0, 0), timeFormat, { locale })}
                                </span>
                            )}
                        </div>
                     ))}

                     {/* Left Side Current Time Indicator (Overlay) */}
                     {isToday(currentDate) && (
                         <div
                             className="absolute left-0 w-full pointer-events-none z-30 flex justify-end pr-2"
                             style={{
                                 top: `${(zonedNow.getHours() * 60 + zonedNow.getMinutes()) / 60 * hourHeight}px`,
                             }}
                         >
                             <span className="text-[10px] font-bold text-white bg-primary px-2 py-1 rounded-lg shadow-md shadow-primary/30 -translate-y-1/2">
                                 {format(zonedNow, nowFormat, { locale })}
                             </span>
                         </div>
                     )}
                </div>

                {/* Day Column */}
                <div className="flex-1 relative">
                     {hours.map((hour) => {
                         return (
                            <div
                                key={hour}
                                className="border-b-[0.5px] border-dashed border-border/20 box-border relative hover:bg-accent/5 transition-colors"
                                style={{ height: hourHeight }}
                            >
                                {/* 4 x 15-minute intervals */}
                                {[0, 15, 30, 45].map((minute) => {
                                    const cellDate = new Date(currentDate);
                                    cellDate.setHours(hour, minute, 0, 0);
                                    const cellId = cellDate.toISOString();
                                    
                                    return (
                                        <DroppableCell 
                                            key={minute}
                                            id={cellId}
                                            date={cellDate}
                                            className="w-full absolute left-0 right-0 z-0 transition-colors"
                                            style={{ 
                                                height: '25%', 
                                                top: `${(minute / 60) * 100}%` 
                                            }}
                                        >
                                            <div 
                                                className="h-full w-full bg-transparent cursor-pointer"
                                                onClick={() => onTimeSlotClick?.(cellDate)}
                                            />
                                        </DroppableCell>
                                    );
                                })}
                            </div>
                         );
                     })}

                     {dayEvents.map(event => {
                       // Calculate layout for overlapping events (same logic as WeekView)
                       const overlappingEvents = dayEvents.filter(e => {
                           if (e.id === event.id) return false;
                           const s1 = getZonedDate(event.start).getTime();
                           const e1 = getZonedDate(event.end).getTime();
                           const s2 = getZonedDate(e.start).getTime();
                           const e2 = getZonedDate(e.end).getTime();
                           return s1 < e2 && e1 > s2;
                       });

                       // Sort overlapping group by start time for consistent positioning
                       const group = [event, ...overlappingEvents].sort((a, b) =>
                           getZonedDate(a.start).getTime() - getZonedDate(b.start).getTime() ||
                           (a.id > b.id ? 1 : -1)
                       );

                       const index = group.findIndex(e => e.id === event.id);
                       const count = group.length;

                       const widthPercent = 100 / count;
                       const leftPercent = index * widthPercent;

                       const zonedStart = getZonedDate(event.start);
                       const zonedEnd = getZonedDate(event.end);

                       const startMinutes = zonedStart.getHours() * 60 + zonedStart.getMinutes();
                       const durationMinutes = differenceInMinutes(zonedEnd, zonedStart);
                       const top = (startMinutes / 60) * hourHeight;
                       const height = (durationMinutes / 60) * hourHeight;

                       const isShortEvent = durationMinutes < 45;

                       return (
                         <DraggableEvent
                            key={`${event.id}-${currentDate.toISOString()}`}
                            event={event}
                            className={`absolute z-10 transition-all ${readonly ? "cursor-default" : ""}`}
                            style={{
                                top: `${top}px`,
                                height: `${Math.max(height, 28)}px`,
                                left: `calc(${leftPercent}% + 4px)`,
                                width: `calc(${widthPercent}% - 8px)`,
                                paddingRight: count > 1 ? '2px' : '0'
                            }}
                         >
                            <ResizableEvent
                                readonly={readonly}
                                event={event}
                                hourHeight={hourHeight}
                                onResize={onEventResize}
                                className="h-full"
                                style={{ height: '100%' }}
                            >
                                <div
                                    className={cn(
                                        "h-full rounded-lg border-[0.5px] shadow-sm overflow-hidden transition-all hover:shadow-lg hover:z-20 group",
                                        "glass backdrop-blur-sm",
                                        readonly ? "cursor-default" : "cursor-grab active:cursor-grabbing",
                                        !event.color && "bg-primary/10 border-primary/20",
                                        isShortEvent ? "px-2 flex items-center" : "px-3 py-2",
                                        count > 1 && "border-l-4"
                                    )}
                                    style={{
                                        backgroundColor: event.color ? `${event.color}15` : undefined,
                                        borderColor: event.color ? `${event.color}30` : undefined,
                                        borderLeftColor: event.color || 'var(--primary)',
                                        borderLeftWidth: count > 1 ? '4px' : '3px'
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEventClick?.(event);
                                    }}
                                    title={count > 1 ? `${event.title} (${index + 1}/${count})` : undefined}
                                >
                                    <div className="flex flex-col h-full overflow-hidden w-full">
                                        <div className={cn(
                                            "font-semibold truncate leading-tight",
                                            isShortEvent ? "text-xs" : "text-sm",
                                            event.color ? "text-foreground" : "text-foreground/90"
                                        )}>
                                            {event.title}
                                        </div>
                                        {!isShortEvent && (
                                            <>
                                                <div className="text-xs text-muted-foreground mt-0.5 font-medium">
                                                    {format(zonedStart, eventTimeFormat, { locale })} - {format(zonedEnd, eventTimeFormat, { locale })}
                                                </div>
                                                {event.description && height > 60 && (
                                                    <div className="text-xs text-muted-foreground/80 mt-1 line-clamp-2">
                                                        {event.description}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        {/* Overlap Badge */}
                                        {count > 1 && !isShortEvent && (
                                            <div className="absolute top-1.5 right-1.5 bg-background/90 backdrop-blur-sm rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold text-muted-foreground border border-border shadow-sm">
                                                {count}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </ResizableEvent>
                         </DraggableEvent>
                       );
                     })}
                     
                     {/* Current Time Indicator */}
                     {isToday(currentDate) && (
                       <div
                         className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                         style={{
                           top: `${(zonedNow.getHours() * 60 + zonedNow.getMinutes()) / 60 * hourHeight}px`
                         }}
                       >
                         {/* Line */}
                         <div className="h-[2px] w-full bg-gradient-to-r from-primary via-primary to-primary/50" />
                         {/* Dot */}
                         <div className="absolute -left-1.5 w-3 h-3 bg-primary rounded-full shadow-lg shadow-primary/40 ring-2 ring-background animate-pulse" />
                       </div>
                     )}
                </div>
            </div>
        </div>
    </div>
  );
};
