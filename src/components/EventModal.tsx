import React, { useState, useEffect, useId, useInsertionEffect, useRef } from 'react';
import { Modal } from './ui/Modal';
import { CalendarEvent, CalendarTranslations, EventType, EventReminder } from '../types';
import { addDays, differenceInCalendarDays, format, differenceInMinutes, startOfDay } from 'date-fns';
import { AlignLeft, Bell, Calendar, Clock, MapPin, Plus, Trash2, Users, X } from './icons';
import { eventColorStyle } from './eventColor';
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

const LABEL = "ck:flex ck:items-center ck:gap-2 ck:text-sm ck:font-semibold ck:text-muted-foreground ck:sm:min-h-10";
const INPUT = "ck:min-h-10 ck:rounded-lg ck:border ck:border-transparent ck:bg-muted ck:px-3 ck:text-sm ck:text-foreground ck:placeholder:text-muted-foreground ck:transition-colors ck:focus:border-ring ck:focus:bg-background ck:focus:outline-hidden";
const CHIP = "ck:inline-flex ck:items-center ck:gap-1.5 ck:min-h-8 ck:rounded-full ck:bg-muted ck:text-xs ck:font-medium ck:text-foreground";

/** One labelled row of the form (spec §8.5): the label and its icon on the left, the controls on the right. */
const Field: React.FC<{ icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; label: string; htmlFor?: string; labelId?: string; children: React.ReactNode }> = ({ icon: Icon, label, htmlFor, labelId, children }) => {
  const content = <><Icon className="ck:w-4 ck:h-4 ck:shrink-0 ck:opacity-80" aria-hidden="true" />{label}</>;
  return (
    <div className="ck:grid ck:gap-1.5 ck:sm:grid-cols-[7.5rem_minmax(0,1fr)] ck:sm:gap-3 ck:items-start">
      {htmlFor ? <label htmlFor={htmlFor} className={LABEL}>{content}</label> : <span id={labelId} className={LABEL}>{content}</span>}
      <div className="ck:min-w-0">{children}</div>
    </div>
  );
};

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

  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isReminderDropdownOpen, setIsReminderDropdownOpen] = useState(false);
  const [guestInput, setGuestInput] = useState('');
  const [guestError, setGuestError] = useState(false);
  const id = useId();

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

  const calendarColor = formData.color || calendars?.find((c) => c.id === formData.calendarId)?.color;
  const duration = getDurationText();

  // ========== EDIT/CREATE MODE ==========
  const renderEditMode = () => (
    <form onSubmit={handleSubmit} className="ck:flex ck:flex-col ck:flex-1 ck:min-h-0 ck:bg-background">
      <div className="ck:flex-1 ck:min-h-0 ck:overflow-y-auto ck:flex ck:flex-col ck:gap-4 ck:px-5 ck:pt-4 ck:pb-5 ck:sm:px-6">
        <div className="ck:flex ck:items-center ck:gap-2">
          <div className="ck:relative">
            <button
              type="button"
              onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
              className="ck:flex ck:w-8 ck:h-8 ck:items-center ck:justify-center ck:rounded-lg ck:hover:bg-muted"
              aria-label={t.eventColor}
              aria-expanded={isColorPickerOpen}
            >
              <span className="ck-dot ck:w-3.5 ck:h-3.5 ck:rounded-[4px]" style={eventColorStyle(calendarColor)} />
            </button>
            {isColorPickerOpen && (
              <div className="ck:absolute ck:top-full ck:left-0 ck:mt-1 ck:p-2 ck:bg-background ck:border ck:border-border ck:rounded-xl ck:shadow-xl ck:z-50 ck:grid ck:grid-cols-5 ck:gap-1.5">
                {COLOR_PALETTE.map(color => (
                  <button
                    key={color}
                    type="button"
                    aria-label={color}
                    aria-pressed={formData.color === color}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, color }));
                      setIsColorPickerOpen(false);
                    }}
                    className={cx("ck:w-7 ck:h-7 ck:rounded-full ck:transition-transform ck:hover:scale-110", formData.color === color && "ck:ring-2 ck:ring-offset-2 ck:ring-offset-background ck:ring-foreground")}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            )}
          </div>
          <h2 id={`${id}-heading`} className="ck:flex-1 ck:text-sm ck:font-semibold ck:text-muted-foreground">
            {mode === 'edit' ? t.editEvent : t.newEvent}
          </h2>
          <button
            type="button"
            onClick={requestClose}
            className="ck:flex ck:w-8 ck:h-8 ck:items-center ck:justify-center ck:rounded-lg ck:text-muted-foreground ck:hover:bg-muted ck:hover:text-foreground"
            aria-label={t.close}
          >
            <X className="ck:w-4 ck:h-4" aria-hidden="true" />
          </button>
        </div>

        <input
          type="text"
          required
          autoFocus
          className="ck:w-full ck:bg-transparent ck:border-0 ck:border-b-2 ck:border-border ck:focus:border-ring ck:px-0.5 ck:py-1.5 ck:font-display ck:text-2xl ck:font-semibold ck:text-foreground ck:placeholder:text-muted-foreground ck:placeholder:font-normal ck:focus:outline-hidden ck:transition-colors"
          value={formData.title}
          onChange={e => setFormData({ ...formData, title: e.target.value })}
          placeholder={t.title}
          aria-label={t.title}
        />

        <Field icon={Clock} label={t.whenLabel} labelId={`${id}-when`}>
          <div role="group" aria-labelledby={`${id}-when`} className="ck:flex ck:flex-col ck:gap-2.5">
            <div className="ck:flex ck:flex-wrap ck:items-center ck:gap-2">
              <label htmlFor={`${id}-start`} className="ck:sr-only">{t.start}</label>
              <input
                id={`${id}-start`}
                type={allDaySpan ? "date" : "datetime-local"}
                className={cx(INPUT, "ck:tabular-nums")}
                value={allDaySpan ? format(allDaySpan.firstDay, 'yyyy-MM-dd') : formatDateForInput(formData.start)}
                onChange={e => handleDateChange('start', e.target.value)}
              />
              <span className="ck:text-muted-foreground" aria-hidden="true">–</span>
              <label htmlFor={`${id}-end`} className="ck:sr-only">{t.end}</label>
              <input
                id={`${id}-end`}
                type={allDaySpan ? "date" : "datetime-local"}
                className={cx(INPUT, "ck:tabular-nums")}
                value={allDaySpan ? format(allDaySpan.lastDay, 'yyyy-MM-dd') : formatDateForInput(formData.end)}
                onChange={e => handleDateChange('end', e.target.value)}
              />
              {duration && <span className="ck:text-xs ck:font-semibold ck:text-muted-foreground ck:tabular-nums">{duration}</span>}
            </div>
            <div className="ck:flex ck:flex-wrap ck:items-center ck:gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={!!formData.allDay}
                onClick={handleAllDayToggle}
                className="ck:inline-flex ck:items-center ck:gap-2.5 ck:min-h-10 ck:text-sm ck:font-medium ck:text-foreground"
              >
                <span aria-hidden="true" className={cx("ck:relative ck:inline-flex ck:h-[22px] ck:w-9 ck:shrink-0 ck:rounded-full ck:transition-colors", formData.allDay ? "ck:bg-primary" : "ck:bg-muted-foreground/30")}>
                  <span className={cx("ck:absolute ck:top-[3px] ck:left-[3px] ck:h-4 ck:w-4 ck:rounded-full ck:bg-background ck:shadow-sm ck:transition-transform", formData.allDay && "ck:translate-x-[14px]")} />
                </span>
                {t.allDay}
              </button>
              <select
                className={cx(INPUT, "ck:min-w-0")}
                aria-label={t.repeat}
                value={formData.recurrence?.freq || ''}
                onChange={e => setFormData({
                  ...formData,
                  recurrence: e.target.value === '' ? undefined : { freq: e.target.value as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY', interval: 1 },
                })}
              >
                <option value="">{t.doesNotRepeat}</option>
                <option value="DAILY">{t.daily}</option>
                <option value="WEEKLY">{t.weekly}</option>
                <option value="MONTHLY">{t.monthly}</option>
                <option value="YEARLY">{t.yearly}</option>
              </select>
            </div>
          </div>
        </Field>

        {calendars && calendars.length > 0 && (
          <Field icon={Calendar} label={t.calendar} htmlFor={`${id}-calendar`}>
            <div className="ck:relative ck:inline-flex ck:max-w-full">
              <span className="ck-dot ck:pointer-events-none ck:absolute ck:left-3 ck:top-1/2 ck:-translate-y-1/2 ck:w-2.5 ck:h-2.5 ck:rounded-[3px]" style={eventColorStyle(calendars.find(c => c.id === formData.calendarId)?.color)} aria-hidden="true" />
              <select
                id={`${id}-calendar`}
                className={cx(INPUT, "ck:pl-8 ck:min-w-48")}
                value={formData.calendarId ?? ''}
                onChange={e => setFormData({ ...formData, calendarId: e.target.value || undefined })}
              >
                {formData.calendarId === undefined && <option value="">{t.select}</option>}
                {/* A calendar the host no longer lists is kept, shown as itself (never silently replaced). */}
                {formData.calendarId !== undefined && !calendars.some(c => c.id === formData.calendarId) && <option value={formData.calendarId}>{formData.calendarId}</option>}
                {calendars.map(cal => <option key={cal.id} value={cal.id}>{cal.label}</option>)}
              </select>
            </div>
          </Field>
        )}

        <Field icon={MapPin} label={t.locationLabel} htmlFor={`${id}-location`}>
          <input
            id={`${id}-location`}
            type="text"
            className={cx(INPUT, "ck:w-full")}
            placeholder={t.addLocation}
            value={formData.location || ''}
            onChange={e => setFormData({ ...formData, location: e.target.value })}
          />
        </Field>

        {/* Guests: U2, free email input instead of a fake suggestion list */}
        <Field icon={Users} label={t.guests} htmlFor={`${id}-guest`}>
          <div className="ck:flex ck:flex-wrap ck:items-center ck:gap-1.5">
            {guests.map(email => (
              <span key={email} className={cx(CHIP, "ck:pl-1 ck:pr-1")}>
                <span
                  className="ck:flex ck:w-6 ck:h-6 ck:items-center ck:justify-center ck:rounded-full ck:text-[11px] ck:font-semibold ck:text-white"
                  style={{ backgroundColor: `hsl(${avatarHue(email)}, 55%, 42%)` }}
                  aria-hidden="true"
                >
                  {email[0].toUpperCase()}
                </span>
                {email}
                <button
                  type="button"
                  onClick={() => removeGuest(email)}
                  className="ck:flex ck:w-6 ck:h-6 ck:items-center ck:justify-center ck:rounded-full ck:text-muted-foreground ck:hover:bg-background ck:hover:text-foreground"
                  aria-label={interpolate(t.removeGuest, { email })}
                >
                  <X className="ck:w-3 ck:h-3" aria-hidden="true" />
                </button>
              </span>
            ))}
            <input
              id={`${id}-guest`}
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
              className={cx(INPUT, "ck:flex-1 ck:min-w-48", guestError && "ck:border-destructive")}
            />
          </div>
          {guestError && <p role="alert" className="ck:mt-1.5 ck:text-xs ck:text-destructive">{t.invalidEmail}</p>}
        </Field>

        <Field icon={Bell} label={t.reminders} labelId={`${id}-reminders`}>
          <div role="group" aria-labelledby={`${id}-reminders`} className="ck:flex ck:flex-wrap ck:items-center ck:gap-1.5">
            {formData.reminders?.map(reminder => (
              <span key={reminder.id} className={cx(CHIP, "ck:pl-3 ck:pr-1")}>
                {/* From the minutes, in the calendar's language (a stored label may be in another). */}
                {reminderLabel(reminder.time, t)}
                <button
                  type="button"
                  onClick={() => removeReminder(reminder.id)}
                  className="ck:flex ck:w-6 ck:h-6 ck:items-center ck:justify-center ck:rounded-full ck:text-muted-foreground ck:hover:bg-background ck:hover:text-foreground"
                  aria-label={t.removeReminder}
                >
                  <X className="ck:w-3 ck:h-3" aria-hidden="true" />
                </button>
              </span>
            ))}
            <div className="ck:relative">
              <button
                type="button"
                onClick={() => setIsReminderDropdownOpen(!isReminderDropdownOpen)}
                aria-expanded={isReminderDropdownOpen}
                className="ck:inline-flex ck:items-center ck:gap-1 ck:min-h-8 ck:rounded-full ck:px-3 ck:text-xs ck:font-semibold ck:text-foreground ck:border ck:border-dashed ck:border-border ck:hover:bg-muted"
              >
                <Plus className="ck:w-3.5 ck:h-3.5" aria-hidden="true" />
                {t.addReminder}
              </button>
              {isReminderDropdownOpen && (
                <>
                  <div className="ck:fixed ck:inset-0 ck:z-40" onClick={() => setIsReminderDropdownOpen(false)} />
                  <div className="ck:absolute ck:left-0 ck:top-full ck:mt-1 ck:w-52 ck:bg-background ck:border ck:border-border ck:rounded-xl ck:shadow-xl ck:z-50 ck:p-1 ck:max-h-60 ck:overflow-y-auto">
                    {REMINDER_OPTIONS.map(minutes => (
                      <button
                        key={minutes}
                        type="button"
                        onClick={() => addReminder(minutes)}
                        className="ck:w-full ck:rounded-lg ck:px-3 ck:py-2 ck:text-left ck:text-sm ck:text-foreground ck:hover:bg-muted"
                      >
                        {reminderLabel(minutes, t)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </Field>

        <Field icon={AlignLeft} label={t.description} htmlFor={`${id}-description`}>
          <textarea
            id={`${id}-description`}
            rows={3}
            className={cx(INPUT, "ck:w-full ck:py-2.5 ck:resize-y")}
            placeholder={t.addNotes}
            value={formData.description || ''}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
          />
        </Field>
      </div>

      <div className="ck:shrink-0 ck:flex ck:items-center ck:gap-2 ck:border-t ck:border-border ck:px-5 ck:py-3 ck:sm:px-6">
        {confirmingDiscard ? (
          <DiscardPrompt translations={t} onKeep={() => setConfirmingDiscard(false)} onDiscard={onClose} />
        ) : (
          <>
            {mode === 'edit' && (
              <button
                type="button"
                onClick={handleDelete}
                className="ck:inline-flex ck:items-center ck:gap-1.5 ck:min-h-10 ck:rounded-lg ck:px-3 ck:text-sm ck:font-semibold ck:text-destructive ck:hover:bg-destructive/10"
              >
                <Trash2 className="ck:w-4 ck:h-4" aria-hidden="true" />
                {t.delete}
              </button>
            )}
            <span className="ck:flex-1" />
            <button
              type="button"
              onClick={requestClose}
              className="ck:min-h-10 ck:rounded-lg ck:px-4 ck:text-sm ck:font-semibold ck:text-foreground ck:hover:bg-muted"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="ck:min-h-10 ck:rounded-lg ck:bg-primary ck:px-5 ck:text-sm ck:font-semibold ck:text-primary-foreground ck:hover:bg-primary/90"
            >
              {mode === 'edit' ? t.saveChanges : t.createEvent}
            </button>
          </>
        )}
      </div>
    </form>
  );

  return (
    <Modal isOpen={isOpen} onClose={requestClose} hideHeader labelledBy={`${id}-heading`} className="ck:p-0 ck:overflow-hidden ck:max-w-[640px] ck:animate-pop-in">
      {renderEditMode()}
    </Modal>
  );
};
