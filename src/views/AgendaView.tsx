import React, { useMemo } from 'react';
import { format, isSameDay, addDays, startOfDay, differenceInMinutes, Locale } from 'date-fns';
import { CalendarEvent, CalendarTranslations } from '../types';
import { cn } from '../utils';
import { eventsByStartDay } from '../core/events';
import { timeFormats, uses24HourClock } from '../core/format';
import { displayToday, toDisplay } from '../core/timezone';
import { AgendaEmptyState } from '../components/EmptyState';
import { motion } from 'framer-motion';
import { Clock, Users, Paperclip, Bell } from 'lucide-react';

interface AgendaViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onCreateEvent?: () => void;
  locale?: Locale;
  translations?: Partial<CalendarTranslations>;
  timezone?: string;
}

const formatDuration = (start: Date, end: Date): string => {
  const minutes = differenceInMinutes(end, start);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
};

const getDateLabel = (
  date: Date,
  today: Date,
  locale?: Locale,
  translations?: Partial<CalendarTranslations>
): string => {
  if (isSameDay(date, today)) return translations?.today || 'Today';
  if (isSameDay(date, addDays(today, 1))) return translations?.tomorrow || 'Tomorrow';
  return format(date, 'EEEE', { locale });
};

export const AgendaView: React.FC<AgendaViewProps> = ({
  currentDate,
  events,
  onEventClick,
  onCreateEvent,
  locale,
  translations,
  timezone,
}) => {
  // Times follow the locale's clock convention (e.g. 24h for pt-BR/fr); the
  // historical 12h format stays the default without a locale.
  const is24h = uses24HourClock(locale);
  const { time: timePattern, compact: compactTimePattern } = timeFormats(locale);
  const today = displayToday(timezone);

  // Group events by display day (T1) for the next 30 days starting from currentDate.
  const groupedEvents = useMemo(() => {
    const byDay = eventsByStartDay(events, timezone);
    const groups: { date: Date; events: CalendarEvent[] }[] = [];
    for (let i = 0; i < 30; i++) {
      const day = addDays(startOfDay(currentDate), i);
      const dayEvents = byDay.get(format(day, 'yyyy-MM-dd'));
      if (dayEvents?.length) {
        groups.push({ date: day, events: [...dayEvents].sort((a, b) => a.start.getTime() - b.start.getTime()) });
      }
    }
    return groups;
  }, [currentDate, events, timezone]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 }
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      {groupedEvents.length === 0 ? (
        <AgendaEmptyState onCreateEvent={onCreateEvent} translations={translations} />
      ) : (
        <motion.div
          className="max-w-3xl mx-auto w-full pb-10 px-4 md:px-6"
          variants={container}
          initial="hidden"
          animate="show"
        >
            {groupedEvents.map((group) => (
                <motion.div
                  key={group.date.toISOString()}
                  className="relative"
                  variants={item}
                >
                    {/* Date Header */}
                    <div className="sticky top-0 bg-background/95 backdrop-blur-md py-4 z-10 border-b border-border/50">
                      <div className="flex items-center gap-4">
                        {/* Date box */}
                        <div className={cn(
                          "flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all",
                          isSameDay(group.date, today)
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                            : "bg-muted/50 text-foreground"
                        )}>
                          <span className="text-2xl font-bold leading-none">
                            {format(group.date, 'd')}
                          </span>
                          <span className="text-xs font-medium uppercase tracking-wide opacity-80">
                            {format(group.date, 'MMM', { locale })}
                          </span>
                        </div>

                        {/* Day info */}
                        <div className="flex flex-col">
                          <span className={cn(
                            "text-lg font-semibold",
                            isSameDay(group.date, today) && "text-primary"
                          )}>
                            {getDateLabel(group.date, today, locale, translations)}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {group.events.length}{' '}
                            {group.events.length !== 1
                              ? (translations?.eventPlural || 'events')
                              : (translations?.eventSingular || 'event')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Events List */}
                    <div className="py-4 space-y-3">
                        {group.events.map((event) => (
                            <motion.div
                                key={event.id}
                                onClick={() => onEventClick?.(event)}
                                className={cn(
                                  "group relative flex gap-4 p-4 rounded-2xl border border-border/40",
                                  "hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5",
                                  "transition-all duration-200 cursor-pointer",
                                  "bg-gradient-to-br from-card via-card to-card/80"
                                )}
                                whileHover={{ scale: 1.01, y: -2 }}
                                transition={{ duration: 0.2 }}
                            >
                                {/* Left accent bar */}
                                <div
                                  className="absolute left-0 top-3 bottom-3 w-1 rounded-full"
                                  style={{ backgroundColor: event.color || 'var(--primary)' }}
                                />

                                {/* Time Column */}
                                <div className="flex flex-col items-center min-w-[70px] pl-2">
                                    {event.allDay ? (
                                        <div className="flex flex-col items-center">
                                          <span className="text-xs font-semibold text-muted-foreground bg-muted/80 px-2.5 py-1 rounded-full">
                                            {translations?.allDay || 'All Day'}
                                          </span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center">
                                          <span className="text-base font-semibold text-foreground">
                                            {format(toDisplay(event.start, timezone), compactTimePattern, { locale })}
                                          </span>
                                          {!is24h && (
                                            <span className="text-xs text-muted-foreground uppercase">
                                              {format(toDisplay(event.start, timezone), 'a')}
                                            </span>
                                          )}
                                          <div className="w-px h-3 bg-border my-1" />
                                          <span className="text-xs text-muted-foreground/70 font-medium">
                                            {formatDuration(event.start, event.end)}
                                          </span>
                                        </div>
                                    )}
                                </div>

                                {/* Event Details */}
                                <div className="flex-1 min-w-0 space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <h4 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                                          {event.title}
                                      </h4>
                                      {/* Color dot */}
                                      <div
                                        className="w-3 h-3 rounded-full shrink-0 mt-1.5"
                                        style={{ backgroundColor: event.color || 'var(--primary)' }}
                                      />
                                    </div>

                                    {event.description && (
                                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                                            {event.description}
                                        </p>
                                    )}

                                    {/* Meta info row */}
                                    <div className="flex flex-wrap items-center gap-3 pt-1">
                                      {!event.allDay && (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                          <Clock className="w-3.5 h-3.5" />
                                          <span>{format(toDisplay(event.start, timezone), timePattern, { locale })} - {format(toDisplay(event.end, timezone), timePattern, { locale })}</span>
                                        </div>
                                      )}

                                      {event.guests && event.guests.length > 0 && (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                          <Users className="w-3.5 h-3.5" />
                                          <span>
                                            {event.guests.length}{' '}
                                            {event.guests.length !== 1
                                              ? (translations?.guestsCount || 'guests')
                                              : (translations?.guestCount || 'guest')}
                                          </span>
                                        </div>
                                      )}

                                      {event.attachments && event.attachments.length > 0 && (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                          <Paperclip className="w-3.5 h-3.5" />
                                          <span>{event.attachments.length}</span>
                                        </div>
                                      )}

                                      {event.reminders && event.reminders.length > 0 && (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                          <Bell className="w-3.5 h-3.5" />
                                          <span>{event.reminders.length}</span>
                                        </div>
                                      )}
                                    </div>
                                </div>

                                {/* Hover arrow indicator */}
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <svg className="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 18l6-6-6-6" />
                                  </svg>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            ))}
        </motion.div>
      )}
    </div>
  );
};
