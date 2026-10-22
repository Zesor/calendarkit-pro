import React, { useState, useEffect, useInsertionEffect, useRef } from 'react';
import { Modal } from './ui/Modal';
import { CalendarEvent, CalendarTranslations, EventType, EventReminder } from '../types';
import { addDays, differenceInCalendarDays, format, differenceInMinutes, startOfDay } from 'date-fns';
import {
    Clock, MapPin, AlignLeft, Trash2, X,
    Users, ChevronDown, Check,
    Bell, BellRing, Plus, Repeat, Tag,
  } from './icons';
import { cx } from '../utils';
import { DiscardPrompt } from './DiscardPrompt';
import { interpolate } from '../core/format';
import { dayEventSpan } from '../core/allDay';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: CalendarEvent | null;
  initialDate?: Date;
  onSave: (event: Partial<CalendarEvent>) => void;
  onDelete?: (eventId: string) => void;
  calendars?: { id: string; label: string; color?: string }[];
  eventTypes?: EventType[];
  translations: CalendarTranslations;
  /** Opens the create form preset to an all-day event (click in the all-day row). */
  initialAllDay?: boolean;
  /** Fields of a new event already chosen (quick create's "More options"). */
  initialValues?: Partial<CalendarEvent>;
}

// Predefined reminder offsets, in minutes before the event
const REMINDER_OPTIONS = [0, 5, 10, 15, 30, 60, 120, 1440, 2880, 10080];

// Color palette for events
const COLOR_PALETTE = [
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#f97316', // Orange
  '#6366f1', // Indigo
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Appends emails not already present, comparing case-insensitively and keeping the first spelling. */
const mergeGuests = (current: string[], added: string[]): string[] => {
  const seen = new Set(current.map(email => email.toLowerCase()));
  const merged = [...current];
  for (const email of added) {
    if (!seen.has(email.toLowerCase())) {
      seen.add(email.toLowerCase());
      merged.push(email);
    }
  }
  return merged;
};

/** Localized reminder label: "30 minutes before", "1 day before"… */
export const reminderLabel = (minutes: number, t: CalendarTranslations): string => {
  if (minutes === 0) return t.reminderAtTime;
  if (minutes === 10080) return t.reminderWeek;
  if (minutes === 1440) return t.reminderDay;
  if (minutes % 1440 === 0) return interpolate(t.reminderDays, { n: minutes / 1440 });
  if (minutes === 60) return t.reminderHour;
  if (minutes % 60 === 0) return interpolate(t.reminderHours, { n: minutes / 60 });
  return interpolate(t.reminderMinutes, { n: minutes });
};

/** Stable avatar hue derived from the email (no fake guest list needed). */
const avatarHue = (email: string) => [...email].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) % 360, 7);

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  event,
  initialDate,
  onSave,
  onDelete,
  calendars,
  translations: t,
  initialAllDay,
  initialValues,
}) => {
  const [mode, setMode] = useState<'edit' | 'create'>('create');
  // Read through a ref so a new initialValues object (an inline prop) does not reset the form.
  const initialValuesRef = useRef(initialValues);
  useInsertionEffect(() => {
    initialValuesRef.current = initialValues;
  });
  // The form as it opened: closing with changes asks first (spec §8.5).
  const openedAs = useRef('');
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  const [formData, setFormData] = useState<Partial<CalendarEvent>>({
    title: '',
    description: '',
    location: '',
    start: new Date(),
    end: new Date(),
    allDay: false,
    calendarId: calendars?.[0]?.id,
    type: undefined,
    recurrence: undefined,
    attachments: [],
    reminders: [],
  });

  const [isCalendarDropdownOpen, setIsCalendarDropdownOpen] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isReminderDropdownOpen, setIsReminderDropdownOpen] = useState(false);
  const [guestInput, setGuestInput] = useState('');
  const [guestError, setGuestError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setGuestInput('');
      setGuestError(false);
      setConfirmingDiscard(false);
      // No made-up defaults (spec §8.5): no reminder, no colour (the calendar's colour applies).
      let opened: Partial<CalendarEvent>;
      // What a dirty check compares with: the blank form, so values carried in from the quick card count as input.
      let pristine: Partial<CalendarEvent> | undefined;
      if (event) {
        setMode('edit');
        opened = {
          ...event,
          start: new Date(event.start),
          end: new Date(event.end),
          attachments: event.attachments || [],
          reminders: event.reminders || [],
          guests: event.guests || [],
        };
      } else {
        setMode('create');
        const base = initialDate || new Date();
        // All-day: exclusive end at midnight after the day. Otherwise one hour.
        const start = initialAllDay ? startOfDay(base) : base;
        const end = initialAllDay ? addDays(start, 1) : new Date(base.getTime() + 60 * 60 * 1000);

        pristine = {
          title: '',
          description: '',
          location: '',
          start,
          end,
          allDay: !!initialAllDay,
          calendarId: calendars?.[0]?.id,
          attachments: [],
          reminders: [],
          guests: [],
        };
        opened = { ...pristine, ...initialValuesRef.current };
      }
      setFormData(opened);
      openedAs.current = JSON.stringify(pristine ?? opened);
    }
  }, [isOpen, event, initialDate, calendars, initialAllDay]);

  const requestClose = () => {
    if (JSON.stringify(formData) !== openedAs.current) setConfirmingDiscard(true);
    else onClose();
  };

  const guests = formData.guests || [];

  /** U2: guests are typed (or pasted as a list) freely; returns false if some entries are not valid emails. */
  const addGuests = (raw: string): boolean => {
    const entries = raw.split(/[\s,;]+/).filter(Boolean);
    const valid = entries.filter(entry => EMAIL.test(entry));
    const invalid = entries.filter(entry => !EMAIL.test(entry));
    if (valid.length > 0) {
      setFormData(prev => ({ ...prev, guests: mergeGuests(prev.guests || [], valid) }));
    }
    setGuestInput(invalid.join(', '));
    setGuestError(invalid.length > 0);
    return invalid.length === 0;
  };

  const removeGuest = (email: string) => {
    setFormData(prev => ({ ...prev, guests: (prev.guests || []).filter(g => g !== email) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Guests still typed in the input are added on save, unless some are not valid emails.
    const pending = guestInput.split(/[\s,;]+/).filter(Boolean);
    if (pending.some(entry => !EMAIL.test(entry))) {
      addGuests(guestInput);
      return;
    }

    const finalGuests = mergeGuests(guests, pending);

    onSave({
      ...formData,
      guests: finalGuests,
      id: event?.id,
    });
    onClose();
  };

  const handleDelete = () => {
    if (event?.id && onDelete) {
      onDelete(event.id);
      onClose();
    }
  };

  const formatDateForInput = (date: Date | undefined) => {
    if (!date) return '';
    return format(date, "yyyy-MM-dd'T'HH:mm");
  };

  // All-day events edit days: the end field shows the last day *included* (the end is exclusive).
  const allDaySpan = formData.allDay && formData.start && formData.end
    ? dayEventSpan({ ...(formData as CalendarEvent), allDay: true })
    : null;

  const handleAllDayToggle = () => {
    if (!formData.start || !formData.end) return;
    if (!formData.allDay) {
      const firstDay = startOfDay(formData.start);
      const lastDay = startOfDay(new Date(Math.max(formData.end.getTime() - 1, formData.start.getTime())));
      setFormData(prev => ({ ...prev, allDay: true, start: firstDay, end: addDays(lastDay, 1) }));
    } else {
      const start = new Date(formData.start);
      start.setHours(9, 0, 0, 0);
      setFormData(prev => ({ ...prev, allDay: false, start, end: new Date(start.getTime() + 60 * 60 * 1000) }));
    }
  };

  const handleAllDayDateChange = (field: 'start' | 'end', value: string) => {
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d || !allDaySpan) return;
    const day = new Date(y, m - 1, d);
    if (field === 'start') {
      // Keep the number of days when moving the start.
      const days = differenceInCalendarDays(allDaySpan.lastDay, allDaySpan.firstDay);
      setFormData(prev => ({ ...prev, start: day, end: addDays(day, days + 1) }));
    } else {
      const firstDay = day < allDaySpan.firstDay ? day : allDaySpan.firstDay;
      setFormData(prev => ({ ...prev, start: firstDay, end: addDays(day, 1) }));
    }
  };

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    if (formData.allDay) {
      handleAllDayDateChange(field, value);
      return;
    }
    const date = new Date(value);
    if (isNaN(date.getTime())) return;

    if (field === 'start') {
        const duration = formData.end!.getTime() - formData.start!.getTime();
        setFormData(prev => ({
            ...prev,
            start: date,
            end: new Date(date.getTime() + duration)
        }));
    } else {
        if (date < formData.start!) {
             setFormData(prev => ({ ...prev, start: date, end: date }));
        } else {
             setFormData(prev => ({ ...prev, end: date }));
        }
    }
  };

  const addReminder = (minutes: number) => {
    const newReminder: EventReminder = {
      id: Math.random().toString(36).slice(2, 11),
      type: 'notification',
      time: minutes,
      label: reminderLabel(minutes, t)
    };
    setFormData(prev => ({
      ...prev,
      reminders: [...(prev.reminders || []), newReminder]
    }));
    setIsReminderDropdownOpen(false);
  };

  const removeReminder = (id: string) => {
    setFormData(prev => ({
      ...prev,
      reminders: prev.reminders?.filter(r => r.id !== id)
    }));
  };

  const getDurationText = () => {
    if (!formData.start || !formData.end) return '';
    if (allDaySpan) {
      const days = differenceInCalendarDays(allDaySpan.lastDay, allDaySpan.firstDay) + 1;
      return days === 1 ? t.durationDay : interpolate(t.durationDays, { n: days });
    }
    const mins = differenceInMinutes(formData.end, formData.start);
    if (mins < 60) return interpolate(t.durationMinutes, { n: mins });
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (remainingMins === 0) return interpolate(t.durationHours, { n: hours });
    return interpolate(t.durationHoursMinutes, { h: hours, m: remainingMins });
  };

  // ========== EDIT/CREATE MODE ==========
  const renderEditMode = () => (
    <form onSubmit={handleSubmit} className="ck:flex ck:flex-col ck:bg-background ck:overflow-hidden ck:w-full ck:max-h-[85vh]">
      {/* Header */}
      <div className="ck:flex ck:items-center ck:justify-between ck:px-5 ck:py-4 ck:border-b ck:border-border/50 ck:shrink-0">
        <div className="ck:flex ck:items-center ck:gap-3">
          <button
            type="button"
            onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
            className="ck:relative ck:p-1"
            aria-label={t.eventColor}
          >
            <div
              className="ck:w-5 ck:h-5 ck:rounded-full ck:cursor-pointer ck:hover:scale-110 ck:transition-transform"
              style={{
                backgroundColor: formData.color || calendars?.find((c) => c.id === formData.calendarId)?.color || 'var(--ck-event)',
                boxShadow: '0 0 0 2px var(--ck-background), 0 0 0 4px var(--ck-border)'
              }}
            />
            {isColorPickerOpen && (
              <div className="ck:absolute ck:top-full ck:left-0 ck:mt-2 ck:p-2 ck:bg-background ck:border ck:border-border ck:rounded-xl ck:shadow-xl ck:z-50 ck:flex ck:flex-wrap ck:gap-1.5 ck:w-[180px]">
                {COLOR_PALETTE.map(color => (
                  <button
                    key={color}
                    type="button"
                    aria-label={color}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, color }));
                      setIsColorPickerOpen(false);
                    }}
                    className={cx(
                      "ck:w-7 ck:h-7 ck:rounded-full ck:transition-all ck:hover:scale-110",
                      formData.color === color && "ck:ring-2 ck:ring-offset-2 ck:ring-offset-background ck:ring-current"
                    )}
                    style={{ backgroundColor: color, color: color }}
                  />
                ))}
              </div>
            )}
          </button>
          <h2 className="ck:text-lg ck:font-semibold ck:text-foreground">
            {mode === 'edit' ? t.editEvent : t.newEvent}
          </h2>
        </div>
        <button
          type="button"
          onClick={requestClose}
          className="ck:p-2 ck:hover:bg-accent ck:rounded-xl ck:transition-all ck:text-muted-foreground ck:hover:text-foreground"
          aria-label={t.close}
        >
          <X className="ck:w-4 ck:h-4" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="ck:flex-1 ck:overflow-y-auto">
        <div className="ck:px-5 ck:py-4 ck:space-y-5">
          {/* Title */}
          <div>
            <input
              type="text"
              required
              autoFocus
              className="ck:w-full ck:text-xl ck:font-semibold ck:border-0 ck:border-b-2 ck:border-transparent ck:focus:border-primary ck:bg-transparent ck:px-0 ck:py-2 ck:placeholder-muted-foreground/50 ck:transition-all ck:text-foreground ck:focus:outline-hidden"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              placeholder={t.title}
              aria-label={t.title}
            />
          </div>

          {/* All-day toggle (ported from PR #1) */}
          <div className="ck:flex ck:items-center ck:justify-between ck:px-1">
            <span id="calendarkit-all-day-label" className="ck:text-sm ck:font-medium ck:text-foreground">{t.allDay}</span>
            <button
              type="button"
              role="switch"
              aria-checked={!!formData.allDay}
              aria-labelledby="calendarkit-all-day-label"
              onClick={handleAllDayToggle}
              className={cx(
                "ck:relative ck:inline-flex ck:h-6 ck:w-11 ck:shrink-0 ck:rounded-full ck:border-2 ck:border-transparent ck:transition-colors ck:cursor-pointer",
                formData.allDay ? "ck:bg-primary" : "ck:bg-muted"
              )}
            >
              <span
                className={cx(
                  "ck:pointer-events-none ck:inline-block ck:h-5 ck:w-5 ck:rounded-full ck:bg-background ck:shadow-sm ck:transition-transform",
                  formData.allDay ? "ck:translate-x-5" : "ck:translate-x-0"
                )}
              />
            </button>
          </div>

          {/* Date & Time Row */}
          <div className="ck:flex ck:items-center ck:gap-3 ck:p-4 ck:rounded-2xl ck:bg-muted/20 ck:border ck:border-border/30">
            <div className="ck:p-2 ck:bg-primary/10 ck:rounded-xl ck:shrink-0">
              <Clock className="ck:w-5 ck:h-5 ck:text-primary" />
            </div>
            <div className="ck:flex-1 ck:grid ck:grid-cols-2 ck:gap-3">
              <div>
                <label htmlFor="calendarkit-event-start" className="ck:text-[10px] ck:font-semibold ck:text-muted-foreground ck:uppercase ck:tracking-wider ck:mb-1 ck:block">{t.start}</label>
                <input
                  id="calendarkit-event-start"
                  type={allDaySpan ? "date" : "datetime-local"}
                  className="ck:w-full ck:bg-background ck:border ck:border-border/50 ck:rounded-xl ck:px-3 ck:py-2 ck:text-sm ck:font-medium ck:text-foreground ck:focus:border-primary ck:focus:ring-2 ck:focus:ring-primary/20 ck:transition-all"
                  value={allDaySpan ? format(allDaySpan.firstDay, 'yyyy-MM-dd') : formatDateForInput(formData.start)}
                  onChange={e => handleDateChange('start', e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="calendarkit-event-end" className="ck:text-[10px] ck:font-semibold ck:text-muted-foreground ck:uppercase ck:tracking-wider ck:mb-1 ck:block">{t.end}</label>
                <input
                  id="calendarkit-event-end"
                  type={allDaySpan ? "date" : "datetime-local"}
                  className="ck:w-full ck:bg-background ck:border ck:border-border/50 ck:rounded-xl ck:px-3 ck:py-2 ck:text-sm ck:font-medium ck:text-foreground ck:focus:border-primary ck:focus:ring-2 ck:focus:ring-primary/20 ck:transition-all"
                  value={allDaySpan ? format(allDaySpan.lastDay, 'yyyy-MM-dd') : formatDateForInput(formData.end)}
                  onChange={e => handleDateChange('end', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Duration Badge */}
          {getDurationText() && (
            <div className="ck:flex ck:justify-center">
              <span className="ck:text-xs ck:font-medium ck:px-3 ck:py-1 ck:rounded-full ck:bg-primary/10 ck:text-primary">
                {getDurationText()}
              </span>
            </div>
          )}

          {/* Reminders */}
          <div className="ck:space-y-2">
            <div className="ck:flex ck:items-center ck:justify-between">
              <div className="ck:flex ck:items-center ck:gap-2">
                <Bell className="ck:w-4 ck:h-4 ck:text-muted-foreground" />
                <span className="ck:text-sm ck:font-medium ck:text-foreground">{t.reminders}</span>
              </div>
              <div className="ck:relative">
                <button
                  type="button"
                  onClick={() => setIsReminderDropdownOpen(!isReminderDropdownOpen)}
                  className="ck:flex ck:items-center ck:gap-1 ck:text-xs ck:font-medium ck:text-primary ck:hover:text-primary/80 ck:transition-colors"
                >
                  <Plus className="ck:w-3.5 ck:h-3.5" />
                  {t.add}
                </button>
                {isReminderDropdownOpen && (
                  <>
                    <div className="ck:fixed ck:inset-0 ck:z-40" onClick={() => setIsReminderDropdownOpen(false)} />
                    <div className="ck:absolute ck:right-0 ck:top-full ck:mt-1 ck:w-48 ck:bg-background ck:border ck:border-border ck:rounded-xl ck:shadow-xl ck:z-50 ck:py-1 ck:max-h-60 ck:overflow-y-auto">
                      {REMINDER_OPTIONS.map(minutes => (
                        <button
                          key={minutes}
                          type="button"
                          onClick={() => addReminder(minutes)}
                          className="ck:w-full ck:px-3 ck:py-2 ck:text-left ck:text-sm ck:hover:bg-accent ck:transition-colors"
                        >
                          {reminderLabel(minutes, t)}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            {formData.reminders && formData.reminders.length > 0 && (
              <div className="ck:flex ck:flex-wrap ck:gap-2">
                {formData.reminders.map(reminder => (
                  <div
                    key={reminder.id}
                    className="ck:flex ck:items-center ck:gap-2 ck:px-3 ck:py-1.5 ck:rounded-full ck:bg-warning/10 ck:border ck:border-warning/20"
                  >
                    <BellRing className="ck:w-3.5 ck:h-3.5 ck:text-warning" />
                    <span className="ck:text-xs ck:font-medium ck:text-warning">
                      {reminder.label || reminderLabel(reminder.time, t)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeReminder(reminder.id)}
                      className="ck:p-0.5 ck:hover:bg-warning/20 ck:rounded-full ck:transition-colors"
                      aria-label={t.removeReminder}
                    >
                      <X className="ck:w-3 ck:h-3 ck:text-warning" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Guests: U2, free email input instead of a fake suggestion list */}
          <div className="ck:space-y-2">
            <div className="ck:flex ck:items-center ck:gap-2">
              <Users className="ck:w-4 ck:h-4 ck:text-muted-foreground" />
              <label htmlFor="calendarkit-event-guest" className="ck:text-sm ck:font-medium ck:text-foreground">{t.guests}</label>
            </div>
            <input
              id="calendarkit-event-guest"
              // Plain text: browser email validation would block saving a pasted list before our own check.
              type="text"
              inputMode="email"
              autoComplete="email"
              value={guestInput}
              onChange={e => {
                setGuestInput(e.target.value);
                setGuestError(false);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  addGuests(guestInput);
                }
              }}
              onBlur={() => guestInput.trim() && addGuests(guestInput)}
              placeholder={t.addGuestPlaceholder}
              aria-invalid={guestError}
              className={cx(
                "ck:w-full ck:px-4 ck:py-3 ck:bg-muted/20 ck:border ck:rounded-xl ck:text-sm ck:text-foreground ck:placeholder-muted-foreground ck:focus:outline-hidden ck:focus:border-primary ck:transition-all",
                guestError ? "ck:border-destructive" : "ck:border-border/30"
              )}
            />
            {guestError && <p role="alert" className="ck:text-xs ck:text-destructive">{t.invalidEmail}</p>}

            {guests.length > 0 && (
              <div className="ck:flex ck:flex-wrap ck:gap-2 ck:mt-2">
                {guests.map(email => (
                  <div
                    key={email}
                    className="ck:flex ck:items-center ck:gap-2 ck:pl-1 ck:pr-2 ck:py-1 ck:bg-muted/30 ck:border ck:border-border/30 ck:rounded-full"
                  >
                    <div
                      className="ck:w-6 ck:h-6 ck:rounded-full ck:flex ck:items-center ck:justify-center ck:text-xs ck:font-semibold ck:text-white"
                      style={{ backgroundColor: `hsl(${avatarHue(email)}, 70%, 50%)` }}
                    >
                      {email[0].toUpperCase()}
                    </div>
                    <span className="ck:text-xs ck:font-medium ck:text-foreground">{email}</span>
                    <button
                      type="button"
                      onClick={() => removeGuest(email)}
                      className="ck:p-0.5 ck:hover:bg-destructive/10 ck:rounded-full ck:transition-colors"
                      aria-label={interpolate(t.removeGuest, { email })}
                    >
                      <X className="ck:w-3 ck:h-3 ck:text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Location */}
          <div className="ck:flex ck:items-center ck:gap-3 ck:p-3 ck:rounded-xl ck:bg-muted/20 ck:border ck:border-border/30">
            <MapPin className="ck:w-5 ck:h-5 ck:text-muted-foreground ck:shrink-0" />
            <input
              type="text"
              className="ck:flex-1 ck:bg-transparent ck:text-sm ck:text-foreground ck:placeholder-muted-foreground ck:focus:outline-hidden"
              placeholder={t.addLocation}
              aria-label={t.addLocation}
              value={formData.location || ''}
              onChange={e => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          {/* Description */}
          <div className="ck:space-y-2">
            <div className="ck:flex ck:items-center ck:gap-2">
              <AlignLeft className="ck:w-4 ck:h-4 ck:text-muted-foreground" />
              <span className="ck:text-sm ck:font-medium ck:text-foreground">{t.notesLabel}</span>
            </div>
            <textarea
              className="ck:w-full ck:bg-muted/20 ck:border ck:border-border/30 ck:rounded-xl ck:px-4 ck:py-3 ck:text-sm ck:min-h-[100px] ck:resize-none ck:text-foreground ck:placeholder-muted-foreground ck:focus:border-primary ck:focus:ring-2 ck:focus:ring-primary/20 ck:transition-all"
              placeholder={t.addNotes}
              aria-label={t.notesLabel}
              value={formData.description || ''}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Recurrence */}
          <div className="ck:flex ck:items-center ck:gap-3 ck:p-3 ck:rounded-xl ck:bg-muted/20 ck:border ck:border-border/30">
            <Repeat className="ck:w-5 ck:h-5 ck:text-muted-foreground ck:shrink-0" />
            <select
              className="ck:flex-1 ck:bg-transparent ck:text-sm ck:text-foreground ck:focus:outline-hidden ck:cursor-pointer"
              aria-label={t.repeat}
              value={formData.recurrence?.freq || ''}
              onChange={e => {
                if (e.target.value === '') {
                  setFormData({ ...formData, recurrence: undefined });
                } else {
                  setFormData({
                    ...formData,
                    recurrence: {
                      freq: e.target.value as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY',
                      interval: 1
                    }
                  });
                }
              }}
            >
              <option value="">{t.doesNotRepeat}</option>
              <option value="DAILY">{t.daily}</option>
              <option value="WEEKLY">{t.weekly}</option>
              <option value="MONTHLY">{t.monthly}</option>
              <option value="YEARLY">{t.yearly}</option>
            </select>
          </div>

          {/* Calendar Selector (only when calendars are provided) */}
          {calendars && calendars.length > 0 && (
          <div className="ck:flex ck:items-center ck:justify-between ck:p-3 ck:rounded-xl ck:bg-muted/20 ck:border ck:border-border/30">
            <div className="ck:flex ck:items-center ck:gap-2">
              <Tag className="ck:w-5 ck:h-5 ck:text-muted-foreground" />
              <span className="ck:text-sm ck:text-foreground">{t.calendar}</span>
            </div>
            <div className="ck:relative">
              <button
                type="button"
                onClick={() => setIsCalendarDropdownOpen(!isCalendarDropdownOpen)}
                className="ck:flex ck:items-center ck:gap-2 ck:px-3 ck:py-1.5 ck:bg-background ck:border ck:border-border/50 ck:rounded-lg ck:text-sm ck:hover:bg-accent/50 ck:transition-all"
              >
                <div
                  className="ck:w-3 ck:h-3 ck:rounded-full"
                  style={{ backgroundColor: calendars.find(c => c.id === formData.calendarId)?.color || '#3b82f6' }}
                />
                <span className="ck:font-medium">{calendars.find(c => c.id === formData.calendarId)?.label || t.select}</span>
                <ChevronDown className="ck:w-3.5 ck:h-3.5 ck:text-muted-foreground" />
              </button>

              {isCalendarDropdownOpen && (
                <>
                  <div className="ck:fixed ck:inset-0 ck:z-40" onClick={() => setIsCalendarDropdownOpen(false)} />
                  <div className="ck:absolute ck:right-0 ck:bottom-full ck:mb-2 ck:w-48 ck:bg-background ck:border ck:border-border ck:rounded-xl ck:shadow-xl ck:z-50 ck:py-1">
                    {calendars.map(cal => (
                      <button
                        key={cal.id}
                        type="button"
                        className="ck:w-full ck:flex ck:items-center ck:gap-3 ck:px-3 ck:py-2 ck:hover:bg-accent ck:transition-colors ck:text-left"
                        onClick={() => {
                          setFormData({ ...formData, calendarId: cal.id });
                          setIsCalendarDropdownOpen(false);
                        }}
                      >
                        <div className="ck:w-3 ck:h-3 ck:rounded-full" style={{ backgroundColor: cal.color }} />
                        <span className="ck:flex-1 ck:text-sm">{cal.label}</span>
                        {formData.calendarId === cal.id && <Check className="ck:w-4 ck:h-4 ck:text-primary" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          )}
        </div>
      </div>

      {confirmingDiscard && (
        <div className="ck:px-5 ck:pb-3">
          <DiscardPrompt translations={t} onKeep={() => setConfirmingDiscard(false)} onDiscard={onClose} />
        </div>
      )}

      {/* Footer */}
      <div className="ck:px-5 ck:py-4 ck:border-t ck:border-border/50 ck:flex ck:items-center ck:justify-between ck:bg-muted/10 ck:shrink-0">
        {mode === 'edit' && (
          <button
            type="button"
            onClick={handleDelete}
            className="ck:flex ck:items-center ck:gap-2 ck:px-4 ck:py-2 ck:text-destructive ck:hover:bg-destructive/10 ck:rounded-xl ck:transition-all ck:text-sm ck:font-medium"
          >
            <Trash2 className="ck:w-4 ck:h-4" />
            {t.delete}
          </button>
        )}
        {mode === 'create' && <div />}
        <div className="ck:flex ck:items-center ck:gap-2">
          <button
            type="button"
            onClick={requestClose}
            className="ck:px-4 ck:py-2.5 ck:text-muted-foreground ck:hover:text-foreground ck:font-medium ck:text-sm ck:rounded-xl ck:transition-all ck:hover:bg-accent"
          >
            {t.cancel}
          </button>
          <button
            type="submit"
            className="ck:px-6 ck:py-2.5 ck:bg-primary ck:hover:bg-primary/90 ck:text-primary-foreground ck:font-semibold ck:text-sm ck:rounded-xl ck:shadow-md ck:transition-all ck:hover:shadow-lg ck:hover:shadow-primary/20 ck:active:scale-95"
          >
            {mode === 'edit' ? t.saveChanges : t.createEvent}
          </button>
        </div>
      </div>
    </form>
  );

  return (
    <Modal isOpen={isOpen} onClose={requestClose} hideHeader className="ck:p-0 ck:overflow-hidden ck:max-w-lg">
      <div className="ck:animate-fade-in">
        {renderEditMode()}
      </div>
    </Modal>
  );
};
