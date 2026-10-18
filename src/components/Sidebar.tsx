import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Plus, ChevronDown, Globe } from './icons';
import { MiniCalendar } from './MiniCalendar';
import { cx } from '../utils';
import { toZonedTime } from 'date-fns-tz';
import { format, Locale } from 'date-fns';
import { timeZoneAbbreviation } from '../core/format';
import { safeColor } from '../core/color';

import { ViewType, CalendarEvent } from '../types';

interface SidebarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onViewChange?: (view: ViewType) => void;
  onEventCreate?: () => void;
  timezone?: string;
  onTimezoneChange?: (timezone: string) => void;
  className?: string;
  readOnly?: boolean;
  calendars?: {
    id: string;
    label: string;
    color?: string;
    active?: boolean;
  }[];
  onCalendarToggle?: (calendarId: string, active: boolean) => void;
  translations?: any;
  events?: CalendarEvent[];
  onImport?: (events: Partial<CalendarEvent>[]) => void;
  locale?: Locale;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentDate,
  onDateChange,
  onViewChange,
  onEventCreate,
  timezone,
  onTimezoneChange,
  className,
  readOnly,
  calendars,
  onCalendarToggle,
  translations,
  locale,
}) => {
  const [calendarsOpen, setCalendarsOpen] = useState(true);
  const [timezoneOpen, setTimezoneOpen] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [hasMounted, setHasMounted] = useState(false);

  // Only run on client to prevent hydration mismatch
  useEffect(() => {
    setHasMounted(true);
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  

  // Cached Intl formatters (C4): building one per zone per render was expensive.
  const getAcronym = (tz: string) => (!tz || !now ? 'LOC' : timeZoneAbbreviation(now, tz));

  const timezones = [
    { value: '', label: translations?.localTime || 'Local Time', acronym: 'LOC' },
    { value: 'UTC', label: 'UTC', acronym: 'UTC' },
    { value: 'America/New_York', label: 'New York', acronym: 'EST' },
    { value: 'America/Chicago', label: 'Chicago', acronym: 'CST' },
    { value: 'America/Denver', label: 'Denver', acronym: 'MST' },
    { value: 'America/Los_Angeles', label: 'Los Angeles', acronym: 'PST' },
    { value: 'Europe/London', label: 'London', acronym: 'GMT' },
    { value: 'Europe/Paris', label: 'Paris', acronym: 'CET' },
    { value: 'Europe/Berlin', label: 'Berlin', acronym: 'CET' },
    { value: 'Asia/Dubai', label: 'Dubai', acronym: 'GST' },
    { value: 'Asia/Tokyo', label: 'Tokyo', acronym: 'JST' },
    { value: 'Asia/Singapore', label: 'Singapore', acronym: 'SGT' },
    { value: 'Australia/Sydney', label: 'Sydney', acronym: 'AEDT' },
  ];

  // Format label with time: HH:MM (ACR)
  const formatTzLabel = (tz: { value: string, label: string, acronym: string }, showTime: boolean = true) => {
      // Don't show time if not mounted yet (SSR) to prevent hydration mismatch
      if (!hasMounted || !now || !showTime) {
          return <span>{tz.label}</span>;
      }

      let time = '';
      let acronym = tz.acronym;

      try {
          if (!tz.value) {
              time = format(now, 'HH:mm');
              // Real local acronym, falling back to the static one
              acronym = timeZoneAbbreviation(now) || 'LOC';
          } else {
              const zDate = toZonedTime(now, tz.value);
              time = format(zDate, 'HH:mm');
              // Calculate dynamic acronym if needed (e.g. DST changes)
              const dynAcronym = getAcronym(tz.value);
              if (dynAcronym && !dynAcronym.includes('GMT') && !dynAcronym.includes('Time')) {
                  acronym = dynAcronym;
              }
          }
      } catch {
          return <span>{tz.label}</span>;
      }

      return (
          <div className="ck:flex ck:justify-between ck:w-full">
              <span>{tz.label}</span>
              <span className="ck:text-muted-foreground ck:ml-2 ck:tabular-nums">
                  {time} <span className="ck:text-xs ck:opacity-75">({acronym})</span>
              </span>
          </div>
      );
  };
  
  const selectedTzObj = timezones.find(t => t.value === (timezone || ''));
  const selectedTimezoneLabel = selectedTzObj ? formatTzLabel(selectedTzObj) : (translations?.localTime || 'Local Time');

  return (
    <div className={cx("ck:flex-col ck:overflow-x-hidden ck:h-full ck:bg-linear-to-b ck:from-background ck:via-background ck:to-muted/10 ck:pt-4 ck:pb-4 ck:overflow-y-auto ck:hidden ck:lg:flex", className)}>
      {!readOnly && (
        <div className="ck:px-4 ck:mb-6">
            <Button
              className="ck:inline-flex ck:text-sm ck:w-full ck:rounded-2xl ck:shadow-lg ck:bg-primary ck:text-primary-foreground ck:hover:bg-primary/90 ck:h-12 ck:gap-3 ck:transition-all ck:duration-300 ck:hover:shadow-xl ck:hover:shadow-primary/20 ck:hover:scale-[1.02] ck:active:scale-[0.98] ck:font-semibold"
              onClick={onEventCreate}
            >
              <Plus className="ck:w-5 ck:h-5" />
              <span className="ck:text-sm">{translations?.create || 'Create'}</span>
            </Button>
        </div>
      )}

      <MiniCalendar
        currentDate={currentDate}
        onDateChange={onDateChange}
        onViewChange={onViewChange}
        locale={locale}
        labels={{ previousMonth: translations?.previousMonth, nextMonth: translations?.nextMonth }}
      />

      <div className="ck:flex-1 ck:px-4 ck:space-y-5 ck:mt-5">
        {/* Calendars List: U1, only when the consumer provides calendars (no demo placeholders) */}
        {calendars && calendars.length > 0 && (
        <div className="ck:bg-muted/20 ck:rounded-2xl ck:p-3 ck:border-[0px] ck:border-border/30">
          <div
            className="ck:flex ck:items-center ck:justify-between ck:cursor-pointer ck:hover:bg-accent/50 ck:p-2 ck:-m-1 ck:rounded-xl ck:mb-2 ck:transition-all ck:duration-200"
            onClick={() => setCalendarsOpen(!calendarsOpen)}
          >
            <span className="ck:text-sm ck:font-semibold ck:text-foreground">{translations?.calendars || 'Calendars'}</span>
            <ChevronDown className={cx("ck:w-4 ck:h-4 ck:text-muted-foreground ck:transition-transform ck:duration-200", calendarsOpen && "ck:rotate-180")} />
          </div>

          {calendarsOpen && (
            <div className="ck:space-y-1">
              {calendars.map(cal => (
                <div
                    key={cal.id}
                    className="ck:flex ck:items-center ck:gap-3 ck:py-2 ck:px-2 ck:hover:bg-accent/60 ck:rounded-xl ck:cursor-pointer ck:group ck:transition-all ck:duration-200"
                    onClick={() => onCalendarToggle?.(cal.id, !(cal.active ?? true))}
                >
                  <div
                    className="ck:relative ck:flex ck:items-center ck:justify-center"
                    // U5: the colour is validated and passed as a CSS variable (no injected <style> tag).
                    style={{ '--cal-color': safeColor(cal.color, 'var(--ck-primary)') } as React.CSSProperties}
                  >
                    <input
                        type="checkbox"
                        checked={cal.active ?? true}
                        onChange={(e) => {
                             e.stopPropagation();
                             onCalendarToggle?.(cal.id, e.target.checked);
                        }}
                        aria-label={cal.label}
                        className="ck:peer ck:h-5 ck:w-5 ck:rounded-md ck:border-2 ck:border-border/60 ck:cursor-pointer ck:appearance-none ck:checked:border-transparent ck:checked:bg-[var(--cal-color)] ck:focus:ring-2 ck:focus:ring-[var(--cal-color)] ck:transition-all ck:duration-200"
                    />
                    <div className="ck:absolute ck:inset-0 ck:flex ck:items-center ck:justify-center ck:pointer-events-none ck:opacity-0 ck:peer-checked:opacity-100 ck:transition-opacity">
                        <svg className="ck:w-3.5 ck:h-3.5 ck:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                  </div>
                  <div className="ck:flex ck:items-center ck:gap-2 ck:flex-1 ck:min-w-0">
                    <span className="ck:text-sm ck:text-foreground/90 ck:truncate ck:font-medium">{cal.label}</span>
                  </div>
                  <div
                    className="ck:w-2 ck:h-2 ck:rounded-full ck:opacity-60 ck:group-hover:opacity-100 ck:transition-opacity"
                    style={{ backgroundColor: safeColor(cal.color, 'var(--ck-primary)') }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        )}
      </div>

      {/* Timezone Selector - Custom UI */}
      <div className="ck:mt-auto ck:px-4 ck:pt-5">
          <div className="ck:bg-muted/20 ck:rounded-2xl ck:p-3">
              <div className="ck:flex ck:items-center ck:gap-2 ck:mb-3">
                  <div className="ck:p-1.5 ck:bg-primary/10 ck:rounded-lg">
                      <Globe className="ck:w-4 ck:h-4 ck:text-primary" />
                  </div>
                  <span className="ck:text-sm ck:font-semibold ck:text-foreground">{translations?.timezone || 'Timezone'}</span>
              </div>

              <div className="ck:relative">
                <button
                    onClick={() => setTimezoneOpen(!timezoneOpen)}
                    className="ck:w-full ck:flex ck:items-center ck:justify-between ck:bg-blue-200/40  ck:hover:bg-blue-200/80 ck:rounded-xl ck:py-2.5 ck:pl-4 ck:pr-3 ck:text-sm ck:text-foreground ck:focus:outline-hidden ck:focus:ring-2 ck:focus:ring-primary/20 ck:focus:border-primary/50 ck:transition-all ck:duration-200 ck:text-left"
                >
                    <div className="ck:flex-1 ck:truncate ck:mr-2 ck:font-medium">{selectedTimezoneLabel}</div>
                    <ChevronDown className={cx("ck:w-4 ck:h-4 ck:text-muted-foreground ck:transition-transform ck:duration-200", timezoneOpen && "ck:rotate-180")} />
                </button>

                {timezoneOpen && (
                    <>
                        <div className="ck:fixed ck:inset-0 ck:z-40" onClick={() => setTimezoneOpen(false)} />
                        <div className="ck:absolute ck:bottom-full ck:left-0 ck:w-full ck:mb-2 ck:bg-background ck:rounded-xl ck:shadow-2xl ck:z-50 ck:max-h-[260px] ck:overflow-y-auto ck:p-1.5 ck:duration-200 ck:backdrop-blur-none">
                            {timezones.map(tz => (
                                <div
                                    key={tz.value}
                                    className={cx(
                                        "ck:px-3 ck:py-2.5 ck:text-sm ck:rounded-lg ck:cursor-pointer ck:transition-all ck:duration-200",
                                        (timezone || '') === tz.value
                                            ? "ck:bg-primary ck:text-primary-foreground ck:font-semibold"
                                            : "ck:text-foreground ck:hover:bg-accent/80"
                                    )}
                                    onClick={() => {
                                        onTimezoneChange?.(tz.value);
                                        setTimezoneOpen(false);
                                    }}
                                >
                                    {formatTzLabel(tz)}
                                </div>
                            ))}
                        </div>
                    </>
                 )}
               </div>
          </div>
      </div>
    </div>
  );
};
