import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { CalendarEvent, CalendarTranslations, EventType, EventAttachment, EventReminder } from '../types';
import { format, differenceInMinutes, Locale } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock, MapPin, AlignLeft, Trash2, X, Edit2,
    Users, Paperclip, File, Calendar, ChevronDown, Check, Download,
    Bell, BellRing, Plus, Repeat, Tag,
    ExternalLink
  } from 'lucide-react';
import { cn } from '../utils';
import { interpolate, timeFormats } from '../core/format';

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
  locale?: Locale;
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

const mapsUrl = (location: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  event,
  initialDate,
  onSave,
  onDelete,
  calendars,
  translations: t,
  locale
}) => {
  const [mode, setMode] = useState<'view' | 'edit' | 'create'>('create');

  const [formData, setFormData] = useState<Partial<CalendarEvent>>({
    title: '',
    description: '',
    location: '',
    start: new Date(),
    end: new Date(),
    allDay: false,
    color: '#3b82f6',
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
    const defaultReminders = (): EventReminder[] => [{ id: '1', type: 'notification', time: 30, label: reminderLabel(30, t) }];
    if (isOpen) {
      setGuestInput('');
      setGuestError(false);
      if (event) {
        setMode('view');
        setFormData({
          ...event,
          start: new Date(event.start),
          end: new Date(event.end),
          attachments: event.attachments || [],
          reminders: event.reminders || defaultReminders(),
          guests: event.guests || [],
        });
      } else {
        setMode('create');
        const start = initialDate || new Date();
        const end = new Date(start);
        end.setHours(start.getHours() + 1);

        setFormData({
          title: '',
          description: '',
          location: '',
          start,
          end,
          allDay: false,
          color: '#3b82f6',
          calendarId: calendars?.[0]?.id,
          attachments: [],
          reminders: defaultReminders(),
          guests: [],
        });
      }
    }
  }, [isOpen, event, initialDate, calendars, t]);

  const guests = formData.guests || [];

  /** U2: guests are typed (or pasted as a list) freely; returns false if some entries are not valid emails. */
  const addGuests = (raw: string): boolean => {
    const entries = raw.split(/[\s,;]+/).filter(Boolean);
    const valid = entries.filter(entry => EMAIL.test(entry));
    const invalid = entries.filter(entry => !EMAIL.test(entry));
    if (valid.length > 0) {
      setFormData(prev => ({ ...prev, guests: [...new Set([...(prev.guests || []), ...valid])] }));
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

    let eventColor = formData.color;
    if (formData.calendarId && calendars) {
        const selectedCal = calendars.find(c => c.id === formData.calendarId);
        if (selectedCal?.color) {
            eventColor = selectedCal.color;
        }
    }

    const finalGuests = [...new Set([...guests, ...pending])];

    onSave({
      ...formData,
      guests: finalGuests,
      color: eventColor,
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

  const handleDateChange = (field: 'start' | 'end', value: string) => {
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
    const mins = differenceInMinutes(formData.end, formData.start);
    if (mins < 60) return interpolate(t.durationMinutes, { n: mins });
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (remainingMins === 0) return interpolate(t.durationHours, { n: hours });
    return interpolate(t.durationHoursMinutes, { h: hours, m: remainingMins });
  };

  const { time: timeFormat } = timeFormats(locale);

  const renderAttachment = (att: EventAttachment) => {
    const content = (
      <>
        <div className="p-2 bg-primary/10 rounded-lg">
          <File className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{att.name}</p>
          <p className="text-xs text-muted-foreground">{att.size}</p>
        </div>
        {att.url && <Download className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
      </>
    );
    const className = "flex items-center gap-3 p-3 rounded-xl border border-border/30 bg-muted/20 transition-all group";
    // U6: only real attachment URLs are downloadable (no generated placeholder file).
    return att.url ? (
      <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer" download={att.name} className={cn(className, "hover:bg-muted/40 cursor-pointer")}>
        {content}
      </a>
    ) : (
      <div key={att.id} className={className}>{content}</div>
    );
  };

  // ========== VIEW MODE ==========
  const renderViewMode = () => (
    <div className="flex flex-col bg-background overflow-hidden w-full max-h-[90vh]">
      {/* Hero Header with Color */}
      <div
        className="relative px-6 pt-6 pb-8"
        style={{
          background: `linear-gradient(135deg, ${event?.color || '#3b82f6'}15 0%, transparent 100%)`
        }}
      >
        {/* Top Actions Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: event?.color || '#3b82f6' }}
            />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {calendars?.find(c => c.id === event?.calendarId)?.label || t.event}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMode('edit')}
              className="p-2 hover:bg-background/80 rounded-lg transition-all text-muted-foreground hover:text-foreground"
              title={t.edit}
              aria-label={t.edit}
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 hover:bg-destructive/10 rounded-lg transition-all text-muted-foreground hover:text-destructive"
              title={t.delete}
              aria-label={t.delete}
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-background/80 rounded-lg transition-all text-muted-foreground hover:text-foreground"
              title={t.close}
              aria-label={t.close}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-foreground mb-3 leading-tight">
          {event?.title || t.noTitle}
        </h1>

        {/* Date & Time */}
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-background/60 backdrop-blur-sm rounded-lg border border-border/30">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">
              {event?.start && format(new Date(event.start), 'EEE, MMM d', { locale })}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-background/60 backdrop-blur-sm rounded-lg border border-border/30">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">
              {event?.start && format(new Date(event.start), timeFormat, { locale })}{' – '}{event?.end && format(new Date(event.end), timeFormat, { locale })}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-6 space-y-4 overflow-y-auto flex-1">
        {/* Location: U4, a real link to a maps search */}
        {event?.location && (
          <motion.a
            href={mapsUrl(event.location)}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 p-4 rounded-2xl bg-muted/30 border border-border/30 group hover:bg-muted/50 transition-all cursor-pointer"
          >
            <div className="p-2 bg-primary/10 rounded-xl">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{event.location}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t.openInMaps}</p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.a>
        )}

        {/* Guests */}
        {event?.guests && event.guests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {event.guests.length} {event.guests.length > 1 ? t.guests : t.guestSingular}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {event.guests.map((email) => (
                <div
                  key={email}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/30 border border-border/30"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white"
                    style={{ backgroundColor: `hsl(${avatarHue(email)}, 70%, 50%)` }}
                  >
                    {email[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{email.split('@')[0]}</p>
                    <p className="text-xs text-muted-foreground truncate">{email}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Reminders */}
        {event?.reminders && event.reminders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-3"
          >
            <div className="p-2 bg-amber-500/10 rounded-xl">
              <Bell className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex flex-wrap gap-2">
              {event.reminders.map(reminder => (
                <span
                  key={reminder.id}
                  className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400"
                >
                  {reminder.label || reminderLabel(reminder.time, t)}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Description */}
        {event?.description && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2">
              <AlignLeft className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{t.notesLabel}</span>
            </div>
            <div className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed pl-6 p-3 rounded-xl bg-muted/20 border border-border/30">
              {event.description}
            </div>
          </motion.div>
        )}

        {/* Attachments */}
        {event?.attachments && event.attachments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{t.attachments}</span>
            </div>
            <div className="grid gap-2">
              {event.attachments.map(renderAttachment)}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );

  // ========== EDIT/CREATE MODE ==========
  const renderEditMode = () => (
    <form onSubmit={handleSubmit} className="flex flex-col bg-background overflow-hidden w-full max-h-[85vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
            className="relative p-1"
            aria-label={t.eventColor}
          >
            <div
              className="w-5 h-5 rounded-full cursor-pointer hover:scale-110 transition-transform"
              style={{
                backgroundColor: formData.color,
                boxShadow: `0 0 0 2px var(--background), 0 0 0 4px ${formData.color}60`
              }}
            />
            {isColorPickerOpen && (
              <div className="absolute top-full left-0 mt-2 p-2 bg-background border border-border rounded-xl shadow-xl z-50 flex flex-wrap gap-1.5 w-[180px]">
                {COLOR_PALETTE.map(color => (
                  <button
                    key={color}
                    type="button"
                    aria-label={color}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, color }));
                      setIsColorPickerOpen(false);
                    }}
                    className={cn(
                      "w-7 h-7 rounded-full transition-all hover:scale-110",
                      formData.color === color && "ring-2 ring-offset-2 ring-offset-background ring-current"
                    )}
                    style={{ backgroundColor: color, color: color }}
                  />
                ))}
              </div>
            )}
          </button>
          <h2 className="text-lg font-semibold text-foreground">
            {mode === 'edit' ? t.editEvent : t.newEvent}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 hover:bg-accent rounded-xl transition-all text-muted-foreground hover:text-foreground"
          aria-label={t.close}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-4 space-y-5">
          {/* Title */}
          <div>
            <input
              type="text"
              required
              autoFocus
              className="w-full text-xl font-semibold border-0 border-b-2 border-transparent focus:border-primary bg-transparent px-0 py-2 placeholder-muted-foreground/50 transition-all text-foreground focus:outline-none"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              placeholder={t.title}
              aria-label={t.title}
            />
          </div>

          {/* Date & Time Row */}
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/20 border border-border/30">
            <div className="p-2 bg-primary/10 rounded-xl shrink-0">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="calendarkit-event-start" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">{t.start}</label>
                <input
                  id="calendarkit-event-start"
                  type="datetime-local"
                  className="w-full bg-background border border-border/50 rounded-xl px-3 py-2 text-sm font-medium text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  value={formatDateForInput(formData.start)}
                  onChange={e => handleDateChange('start', e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="calendarkit-event-end" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">{t.end}</label>
                <input
                  id="calendarkit-event-end"
                  type="datetime-local"
                  className="w-full bg-background border border-border/50 rounded-xl px-3 py-2 text-sm font-medium text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  value={formatDateForInput(formData.end)}
                  onChange={e => handleDateChange('end', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Duration Badge */}
          {getDurationText() && (
            <div className="flex justify-center">
              <span className="text-xs font-medium px-3 py-1 rounded-full bg-primary/10 text-primary">
                {getDurationText()}
              </span>
            </div>
          )}

          {/* Reminders */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{t.reminders}</span>
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsReminderDropdownOpen(!isReminderDropdownOpen)}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t.add}
                </button>
                {isReminderDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsReminderDropdownOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 w-48 bg-background border border-border rounded-xl shadow-xl z-50 py-1 max-h-60 overflow-y-auto">
                      {REMINDER_OPTIONS.map(minutes => (
                        <button
                          key={minutes}
                          type="button"
                          onClick={() => addReminder(minutes)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
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
              <div className="flex flex-wrap gap-2">
                {formData.reminders.map(reminder => (
                  <div
                    key={reminder.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20"
                  >
                    <BellRing className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                      {reminder.label || reminderLabel(reminder.time, t)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeReminder(reminder.id)}
                      className="p-0.5 hover:bg-amber-500/20 rounded-full transition-colors"
                      aria-label={t.removeReminder}
                    >
                      <X className="w-3 h-3 text-amber-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Guests: U2, free email input instead of a fake suggestion list */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <label htmlFor="calendarkit-event-guest" className="text-sm font-medium text-foreground">{t.guests}</label>
            </div>
            <input
              id="calendarkit-event-guest"
              type="email"
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
              className={cn(
                "w-full px-4 py-3 bg-muted/20 border rounded-xl text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-all",
                guestError ? "border-destructive" : "border-border/30"
              )}
            />
            {guestError && <p role="alert" className="text-xs text-destructive">{t.invalidEmail}</p>}

            {guests.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {guests.map(email => (
                  <div
                    key={email}
                    className="flex items-center gap-2 pl-1 pr-2 py-1 bg-muted/30 border border-border/30 rounded-full"
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                      style={{ backgroundColor: `hsl(${avatarHue(email)}, 70%, 50%)` }}
                    >
                      {email[0].toUpperCase()}
                    </div>
                    <span className="text-xs font-medium text-foreground">{email}</span>
                    <button
                      type="button"
                      onClick={() => removeGuest(email)}
                      className="p-0.5 hover:bg-destructive/10 rounded-full transition-colors"
                      aria-label={interpolate(t.removeGuest, { email })}
                    >
                      <X className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Location */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/30">
            <MapPin className="w-5 h-5 text-muted-foreground shrink-0" />
            <input
              type="text"
              className="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground focus:outline-none"
              placeholder={t.addLocation}
              aria-label={t.addLocation}
              value={formData.location || ''}
              onChange={e => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlignLeft className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{t.notesLabel}</span>
            </div>
            <textarea
              className="w-full bg-muted/20 border border-border/30 rounded-xl px-4 py-3 text-sm min-h-[100px] resize-none text-foreground placeholder-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder={t.addNotes}
              aria-label={t.notesLabel}
              value={formData.description || ''}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Recurrence */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/30">
            <Repeat className="w-5 h-5 text-muted-foreground shrink-0" />
            <select
              className="flex-1 bg-transparent text-sm text-foreground focus:outline-none cursor-pointer"
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
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30">
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-foreground">{t.calendar}</span>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsCalendarDropdownOpen(!isCalendarDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border/50 rounded-lg text-sm hover:bg-accent/50 transition-all"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: calendars.find(c => c.id === formData.calendarId)?.color || '#3b82f6' }}
                />
                <span className="font-medium">{calendars.find(c => c.id === formData.calendarId)?.label || t.select}</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>

              {isCalendarDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsCalendarDropdownOpen(false)} />
                  <div className="absolute right-0 bottom-full mb-2 w-48 bg-background border border-border rounded-xl shadow-xl z-50 py-1">
                    {calendars.map(cal => (
                      <button
                        key={cal.id}
                        type="button"
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent transition-colors text-left"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            calendarId: cal.id,
                            color: cal.color || formData.color
                          });
                          setIsCalendarDropdownOpen(false);
                        }}
                      >
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cal.color }} />
                        <span className="flex-1 text-sm">{cal.label}</span>
                        {formData.calendarId === cal.id && <Check className="w-4 h-4 text-primary" />}
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

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border/50 flex items-center justify-between bg-muted/10 shrink-0">
        {mode === 'edit' && (
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 text-destructive hover:bg-destructive/10 rounded-xl transition-all text-sm font-medium"
          >
            <Trash2 className="w-4 h-4" />
            {t.delete}
          </button>
        )}
        {mode === 'create' && <div />}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-muted-foreground hover:text-foreground font-medium text-sm rounded-xl transition-all hover:bg-accent"
          >
            {t.cancel}
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm rounded-xl shadow-md transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-95"
          >
            {mode === 'edit' ? t.saveChanges : t.createEvent}
          </button>
        </div>
      </div>
    </form>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} hideHeader className="p-0 overflow-hidden max-w-lg rounded-2xl shadow-2xl">
      <AnimatePresence mode="wait">
        {mode === 'view' && event ? (
          <motion.div
            key="view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {renderViewMode()}
          </motion.div>
        ) : (
          <motion.div
            key="edit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {renderEditMode()}
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
};
