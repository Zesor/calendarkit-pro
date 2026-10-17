import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Plus, ChevronDown, Globe, Download, Upload } from 'lucide-react';
import { MiniCalendar } from './MiniCalendar';
import { cn } from '../utils';
import { toZonedTime } from 'date-fns-tz';
import { format, Locale } from 'date-fns';

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
  
  // Default demo data if no calendars provided
  const defaultCalendars = [
    { id: '1', label: 'My Calendar', color: '#3b82f6', active: true },
    { id: '2', label: 'Birthdays', color: '#10b981', active: true },
    { id: '3', label: 'Tasks', color: '#6366f1', active: true },
  ];

  const displayCalendars = calendars || defaultCalendars;

  const getAcronym = (tz: string) => {
      if (!tz || !now) return 'LOC';
      try {
        return new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' })
            .formatToParts(now)
            .find(part => part.type === 'timeZoneName')?.value || '';
      } catch (e) { return ''; }
  };

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
              // Try to get real local acronym
              try {
                  acronym = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
                      .formatToParts(now)
                      .find(part => part.type === 'timeZoneName')?.value || 'LOC';
              } catch (e) {}
          } else {
              const zDate = toZonedTime(now, tz.value);
              time = format(zDate, 'HH:mm');
              // Calculate dynamic acronym if needed (e.g. DST changes)
              const dynAcronym = getAcronym(tz.value);
              if (dynAcronym && !dynAcronym.includes('GMT') && !dynAcronym.includes('Time')) {
                  acronym = dynAcronym;
              }
          }
      } catch (e) {
          return <span>{tz.label}</span>;
      }

      return (
          <div className="flex justify-between w-full">
              <span>{tz.label}</span>
              <span className="text-muted-foreground ml-2 tabular-nums">
                  {time} <span className="text-xs opacity-75">({acronym})</span>
              </span>
          </div>
      );
  };
  
  const selectedTzObj = timezones.find(t => t.value === (timezone || ''));
  const selectedTimezoneLabel = selectedTzObj ? formatTzLabel(selectedTzObj) : (translations?.localTime || 'Local Time');

  return (
    <div className={cn("flex flex-col w-[260px] overflow-x-hidden h-full bg-gradient-to-b scrollbar-hide from-background via-background to-muted/10 pt-4 pb-4 overflow-y-auto hidden lg:flex", className)}>
      {!readOnly && (
        <div className="px-4 mb-6">
            <Button
              className="w-full rounded-2xl shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 h-12 gap-3 justify-center transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] font-semibold"
              onClick={onEventCreate}
            >
              <Plus className="w-5 h-5" />
              <span className="text-sm">{translations?.create || 'Create'}</span>
            </Button>
        </div>
      )}

      <MiniCalendar currentDate={currentDate} onDateChange={onDateChange} onViewChange={onViewChange} locale={locale} />

      <div className="flex-1 px-4 space-y-5 mt-5">
        {/* Calendars List */}
        <div className="bg-muted/20 rounded-2xl p-3 border-[0px] border-border/30">
          <div
            className="flex items-center justify-between cursor-pointer hover:bg-accent/50 p-2 -m-1 rounded-xl mb-2 transition-all duration-200"
            onClick={() => setCalendarsOpen(!calendarsOpen)}
          >
            <span className="text-sm font-semibold text-foreground">{translations?.calendars || 'Calendars'}</span>
            <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", calendarsOpen && "rotate-180")} />
          </div>

          {calendarsOpen && (
            <div className="space-y-1">
              {displayCalendars.map(cal => (
                <div
                    key={cal.id}
                    className="flex items-center gap-3 py-2 px-2 hover:bg-accent/60 rounded-xl cursor-pointer group transition-all duration-200"
                    onClick={() => onCalendarToggle?.(cal.id, !(cal.active ?? true))}
                >
                  <div className="relative flex items-center justify-center">
                    <input
                        type="checkbox"
                        checked={cal.active ?? true}
                        onChange={(e) => {
                             e.stopPropagation();
                             onCalendarToggle?.(cal.id, e.target.checked);
                        }}
                        className="peer h-5 w-5 rounded-md border-2 border-border/60 cursor-pointer appearance-none checked:border-transparent transition-all duration-200"
                        style={{ '--primary-color': cal.color } as React.CSSProperties}
                        data-cal-id={cal.id}
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <style>{`
                      input[type="checkbox"][data-cal-id="${cal.id}"]:checked {
                        background-color: ${cal.color} !important;
                        border-color: ${cal.color} !important;
                      }
                      input[type="checkbox"][data-cal-id="${cal.id}"]:focus {
                        --tw-ring-color: ${cal.color}40 !important;
                      }
                    `}</style>
                  </div>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm text-foreground/90 truncate font-medium">{cal.label}</span>
                  </div>
                  <div
                    className="w-2 h-2 rounded-full opacity-60 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: cal.color }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Timezone Selector - Custom UI */}
      <div className="mt-auto px-4 pt-5">
          <div className="bg-muted/20 rounded-2xl p-3">
              <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                      <Globe className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{translations?.timezone || 'Timezone'}</span>
              </div>

              <div className="relative">
                <button
                    onClick={() => setTimezoneOpen(!timezoneOpen)}
                    className="w-full flex items-center justify-between bg-blue-200/40  hover:bg-blue-200/80 rounded-xl py-2.5 pl-4 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all duration-200 text-left"
                >
                    <div className="flex-1 truncate mr-2 font-medium">{selectedTimezoneLabel}</div>
                    <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", timezoneOpen && "rotate-180")} />
                </button>

                {timezoneOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setTimezoneOpen(false)} />
                        <div className="absolute bottom-full left-0 w-full mb-2 bg-background rounded-xl shadow-2xl z-50 max-h-[260px] overflow-y-auto p-1.5 animate-in fade-in zoom-in-95 duration-200 backdrop-blur-none">
                            {timezones.map(tz => (
                                <div
                                    key={tz.value}
                                    className={cn(
                                        "px-3 py-2.5 text-sm rounded-lg cursor-pointer transition-all duration-200",
                                        (timezone || '') === tz.value
                                            ? "bg-primary text-primary-foreground font-semibold"
                                            : "text-foreground hover:bg-accent/80"
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
