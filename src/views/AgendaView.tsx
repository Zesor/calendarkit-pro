import React, { useMemo } from 'react';
import { format, isSameDay, addDays, startOfDay, differenceInMinutes, Locale } from 'date-fns';
import { CalendarEvent, CalendarTranslations } from '../types';
import { cx } from '../utils';
import { useClassNames, useComponents } from '../components/customize';
import { eventsByStartDay } from '../core/events';
import { timeFormats, uses24HourClock } from '../core/format';
import { displayToday, toDisplay } from '../core/timezone';
import { AgendaEmptyState } from '../components/EmptyState';
import { eventColorStyle, resolveEventColor, useCalendars } from '../components/eventColor';
import { Clock, Users, Paperclip, Bell } from '../components/icons';

interface AgendaViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onCreateEvent?: () => void;
  locale?: Locale;
  translations?: Partial<CalendarTranslations>;
  timezone?: string;
  onEventContextMenu?: (event: CalendarEvent, e: React.MouseEvent) => void;
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
  onEventContextMenu,
}) => {
  const classNames = useClassNames();
  const { EmptyState } = useComponents();
  // Times follow the locale's clock convention (e.g. 24h for pt-BR/fr); the
  // historical 12h format stays the default without a locale.
  const is24h = uses24HourClock(locale);
  const { time: timePattern, compact: compactTimePattern } = timeFormats(locale);
  const today = displayToday(timezone);

  // Group events by display day (T1) for the next 30 days starting from currentDate.
  const calendars = useCalendars();
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


  return (
    <div className="ck:flex ck:flex-col ck:h-full ck:bg-background ck:overflow-y-auto">
      {groupedEvents.length === 0 ? (
        EmptyState ? <EmptyState onCreate={onCreateEvent} /> : <AgendaEmptyState onCreateEvent={onCreateEvent} translations={translations} />
      ) : (
        <div className="ck:max-w-3xl ck:mx-auto ck:w-full ck:pb-10 ck:px-4 ck:md:px-6">
            {groupedEvents.map((group, index) => (
                <div
                  key={group.date.toISOString()}
                  className="ck:relative ck:animate-slide-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                    {/* Date Header */}
                    <div className="ck:sticky ck:top-0 ck:bg-background/95 ck:backdrop-blur-md ck:py-4 ck:z-10 ck:border-b ck:border-border/50">
                      <div className="ck:flex ck:items-center ck:gap-4">
                        {/* Date box */}
                        <div className={cx(
                          "ck:flex ck:flex-col ck:items-center ck:justify-center ck:w-16 ck:h-16 ck:rounded-2xl ck:transition-all",
                          isSameDay(group.date, today)
                            ? "ck:bg-primary ck:text-primary-foreground ck:shadow-lg ck:shadow-primary/30"
                            : "ck:bg-muted/50 ck:text-foreground"
                        )}>
                          <span className="ck:text-2xl ck:font-bold ck:leading-none">
                            {format(group.date, 'd')}
                          </span>
                          <span className="ck:text-xs ck:font-medium ck:uppercase ck:tracking-wide ck:opacity-80">
                            {format(group.date, 'MMM', { locale })}
                          </span>
                        </div>

                        {/* Day info */}
                        <div className="ck:flex ck:flex-col">
                          <span className={cx(
                            "ck:text-lg ck:font-semibold",
                            isSameDay(group.date, today) && "ck:text-primary"
                          )}>
                            {getDateLabel(group.date, today, locale, translations)}
                          </span>
                          <span className="ck:text-sm ck:text-muted-foreground">
                            {group.events.length}{' '}
                            {group.events.length !== 1
                              ? (translations?.eventPlural || 'events')
                              : (translations?.eventSingular || 'event')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Events List */}
                    <div className="ck:py-4 ck:space-y-3">
                        {group.events.map((event) => (
                            <div
                                key={event.id}
                                onClick={() => onEventClick?.(event)}
                                onContextMenu={onEventContextMenu ? (e) => onEventContextMenu(event, e) : undefined}
                                className={cx(
                                  "ck:group ck:relative ck:flex ck:gap-4 ck:p-4 ck:rounded-2xl ck:border ck:border-border/40",
                                  "ck:hover:border-primary/40 ck:hover:shadow-lg ck:hover:shadow-primary/5",
                                  "ck:transition-all ck:duration-200 ck:cursor-pointer ck:hover:scale-[1.01] ck:hover:-translate-y-0.5",
                                  "ck:bg-linear-to-br ck:from-card ck:via-card ck:to-card/80",
                                  classNames.event
                                )}
                            >
                                {/* Time Column */}
                                <div className="ck:flex ck:flex-col ck:items-center ck:min-w-[70px] ck:pl-2">
                                    {event.allDay ? (
                                        <div className="ck:flex ck:flex-col ck:items-center">
                                          <span className="ck:text-xs ck:font-semibold ck:text-muted-foreground ck:bg-muted/80 ck:px-2.5 ck:py-1 ck:rounded-full">
                                            {translations?.allDay || 'All Day'}
                                          </span>
                                        </div>
                                    ) : (
                                        <div className="ck:flex ck:flex-col ck:items-center">
                                          <span className="ck:text-base ck:font-semibold ck:text-foreground">
                                            {format(toDisplay(event.start, timezone), compactTimePattern, { locale })}
                                          </span>
                                          {!is24h && (
                                            <span className="ck:text-xs ck:text-muted-foreground ck:uppercase">
                                              {format(toDisplay(event.start, timezone), 'a')}
                                            </span>
                                          )}
                                          <div className="ck:w-px ck:h-3 ck:bg-border ck:my-1" />
                                          <span className="ck:text-xs ck:text-muted-foreground/70 ck:font-medium">
                                            {formatDuration(event.start, event.end)}
                                          </span>
                                        </div>
                                    )}
                                </div>

                                {/* Event Details */}
                                <div className="ck:flex-1 ck:min-w-0 ck:space-y-2">
                                    <div className="ck:flex ck:items-start ck:justify-between ck:gap-2">
                                      <h4 className="ck:text-base ck:font-semibold ck:text-foreground ck:group-hover:text-primary ck:transition-colors ck:line-clamp-1">
                                          {event.title}
                                      </h4>
                                      {/* Color dot */}
                                      <div
                                        className="ck-dot ck:w-3 ck:h-3 ck:rounded-full ck:shrink-0 ck:mt-1.5"
                                        style={eventColorStyle(resolveEventColor(event, calendars))}
                                      />
                                    </div>

                                    {event.description && (
                                        <p className="ck:text-sm ck:text-muted-foreground ck:line-clamp-2 ck:leading-relaxed">
                                            {event.description}
                                        </p>
                                    )}

                                    {/* Meta info row */}
                                    <div className="ck:flex ck:flex-wrap ck:items-center ck:gap-3 ck:pt-1">
                                      {!event.allDay && (
                                        <div className="ck:flex ck:items-center ck:gap-1.5 ck:text-xs ck:text-muted-foreground">
                                          <Clock className="ck:w-3.5 ck:h-3.5" />
                                          <span>{format(toDisplay(event.start, timezone), timePattern, { locale })} - {format(toDisplay(event.end, timezone), timePattern, { locale })}</span>
                                        </div>
                                      )}

                                      {event.guests && event.guests.length > 0 && (
                                        <div className="ck:flex ck:items-center ck:gap-1.5 ck:text-xs ck:text-muted-foreground">
                                          <Users className="ck:w-3.5 ck:h-3.5" />
                                          <span>
                                            {event.guests.length}{' '}
                                            {event.guests.length !== 1
                                              ? (translations?.guestsCount || 'guests')
                                              : (translations?.guestCount || 'guest')}
                                          </span>
                                        </div>
                                      )}

                                      {event.attachments && event.attachments.length > 0 && (
                                        <div className="ck:flex ck:items-center ck:gap-1.5 ck:text-xs ck:text-muted-foreground">
                                          <Paperclip className="ck:w-3.5 ck:h-3.5" />
                                          <span>{event.attachments.length}</span>
                                        </div>
                                      )}

                                      {event.reminders && event.reminders.length > 0 && (
                                        <div className="ck:flex ck:items-center ck:gap-1.5 ck:text-xs ck:text-muted-foreground">
                                          <Bell className="ck:w-3.5 ck:h-3.5" />
                                          <span>{event.reminders.length}</span>
                                        </div>
                                      )}
                                    </div>
                                </div>

                                {/* Hover arrow indicator */}
                                <div className="ck:absolute ck:right-4 ck:top-1/2 ck:-translate-y-1/2 ck:opacity-0 ck:group-hover:opacity-100 ck:transition-opacity">
                                  <svg className="ck:w-5 ck:h-5 ck:text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 18l6-6-6-6" />
                                  </svg>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
};
