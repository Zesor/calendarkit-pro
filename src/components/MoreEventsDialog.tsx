import React from 'react';
import { format, Locale } from 'date-fns';
import { CalendarEvent, CalendarTranslations } from '../types';
import { interpolate, timeFormats } from '../core/format';
import { toDisplay } from '../core/timezone';
import { Modal } from './ui/Modal';
import { useEventColorStyle } from './eventColor';

interface MoreEventsDialogProps {
  events: CalendarEvent[];
  onClose: () => void;
  onEventClick: (event: CalendarEvent) => void;
  timezone?: string;
  locale?: Locale;
  translations?: Partial<CalendarTranslations>;
}

const MoreEventsItem: React.FC<{ event: CalendarEvent; time: string; onClick: () => void }> = ({ event, time, onClick }) => {
  const colorStyle = useEventColorStyle(event);
  return (
    <button
      type="button"
      className="ck:flex ck:w-full ck:items-center ck:gap-3 ck:rounded-lg ck:px-3 ck:py-2 ck:text-left ck:text-sm ck:hover:bg-muted ck:transition-colors"
      onClick={onClick}
    >
      <span className="ck-dot ck:w-2.5 ck:h-2.5 ck:rounded-[3px] ck:shrink-0" style={colorStyle} aria-hidden="true" />
      <span className="ck:shrink-0 ck:text-muted-foreground ck:tabular-nums">{time}</span>
      <span className="ck:truncate ck:font-medium ck:text-foreground">{event.title}</span>
    </button>
  );
};

/** The events behind a "+N" button (spec §8.4): each one opens the event. */
export const MoreEventsDialog: React.FC<MoreEventsDialogProps> = ({ events, onClose, onEventClick, timezone, locale, translations }) => {
  const formats = timeFormats(locale);
  return (
    <Modal
      isOpen={events.length > 0}
      onClose={onClose}
      title={interpolate(translations?.eventsCount || '{n} events', { n: events.length })}
      closeLabel={translations?.close}
    >
      <div className="ck:p-2 ck:flex ck:flex-col ck:gap-0.5 ck:overflow-y-auto">
        {events.map((event) => (
          <MoreEventsItem
            key={event.id}
            event={event}
            time={`${format(toDisplay(event.start, timezone), formats.time, { locale })} – ${format(toDisplay(event.end, timezone), formats.time, { locale })}`}
            onClick={() => onEventClick(event)}
          />
        ))}
      </div>
    </Modal>
  );
};
