import { useMemo, useState } from 'react';
import {
  addDays, addMonths, addWeeks, endOfMonth, format, startOfMonth, startOfWeek,
  subDays, subMonths, subWeeks,
} from 'date-fns';
import { DragEndEvent } from '@dnd-kit/core';
import { ViewType, CalendarEvent } from '../types';
import { computeDrop } from '../core/dnd';
import { normalizeEvents } from '../core/events';
import { DateRange, excludeOccurrence, expandRecurrences, shiftSeries, stripOccurrenceFields } from '../core/recurrence';
import { useStableCallback } from './useStableCallback';

interface UseCalendarLogicProps {
  events: CalendarEvent[];
  view?: ViewType;
  onViewChange?: (view: ViewType) => void;
  date?: Date;
  onDateChange?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onEventUpdate?: (event: CalendarEvent) => void;
  onEventCreate?: (event: Partial<CalendarEvent>) => void;
  onEventDelete?: (eventId: string) => void;
  onEventDrop?: (event: CalendarEvent, start: Date, end: Date) => void;
  onEventResize?: (event: CalendarEvent, start: Date, end: Date) => void;
  onOccurrenceDelete?: (occurrence: CalendarEvent, updatedSeries: CalendarEvent) => void;
  readOnly?: boolean;
  timezone?: string;
}

/** Occurrences are expanded for the focused month ± one month, plus the agenda's 30 days (R4). */
export function expansionRange(monthStart: Date): DateRange {
  return {
    start: startOfWeek(startOfMonth(subMonths(monthStart, 1))),
    end: addDays(endOfMonth(addMonths(monthStart, 1)), 37),
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const useCalendarLogic = ({
  events,
  view: controlledView,
  onViewChange: controlledOnViewChange,
  date: controlledDate,
  onDateChange: controlledOnDateChange,
  onEventClick,
  onEventUpdate,
  onEventCreate,
  onEventDelete,
  onEventDrop,
  onEventResize,
  onOccurrenceDelete,
  readOnly,
  timezone
}: UseCalendarLogicProps) => {
  const [internalView, setInternalView] = useState<ViewType>('week');
  const [internalDate, setInternalDate] = useState(() => new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [modalInitialDate, setModalInitialDate] = useState<Date | undefined>(undefined);
  const [modalInitialResourceId, setModalInitialResourceId] = useState<string | undefined>(undefined);

  const view = controlledView ?? internalView;
  const currentDate = controlledDate ?? internalDate;

  // Coerce dates and drop invalid events once per `events` array (cached in the core).
  const normalizedEvents = useMemo(() => normalizeEvents(events), [events]);

  // The expansion range only changes with the focused month, not with every day change (R4).
  const monthKey = format(currentDate, 'yyyy-MM');
  const range = useMemo(() => expansionRange(new Date(`${monthKey}-01T00:00:00`)), [monthKey]);

  const expandedEvents = useMemo(
    () => expandRecurrences(normalizedEvents, range, timezone),
    [normalizedEvents, range, timezone],
  );

  const masterOf = (occurrence: CalendarEvent) =>
    normalizedEvents.find((e) => e.id === occurrence.originalEventId);

  const handleViewChange = useStableCallback((newView: ViewType) => {
    if (controlledOnViewChange) {
      controlledOnViewChange(newView);
    } else {
      setInternalView(newView);
    }
  });

  const handleDateChange = useStableCallback((newDate: Date) => {
    if (controlledOnDateChange) {
      controlledOnDateChange(newDate);
    } else {
      setInternalDate(newDate);
    }
  });

  const handlePrev = useStableCallback(() => {
    switch (view) {
      case 'month':
        handleDateChange(subMonths(currentDate, 1));
        break;
      case 'week':
        handleDateChange(subWeeks(currentDate, 1));
        break;
      case 'day':
      case 'resource':
        handleDateChange(subDays(currentDate, 1));
        break;
      case 'agenda':
        handleDateChange(subDays(currentDate, 7));
        break;
    }
  });

  const handleNext = useStableCallback(() => {
    switch (view) {
      case 'month':
        handleDateChange(addMonths(currentDate, 1));
        break;
      case 'week':
        handleDateChange(addWeeks(currentDate, 1));
        break;
      case 'day':
      case 'resource':
        handleDateChange(addDays(currentDate, 1));
        break;
      case 'agenda':
        handleDateChange(addDays(currentDate, 7));
        break;
    }
  });

  const handleToday = useStableCallback(() => {
    handleDateChange(new Date());
  });

  const handleDateClick = useStableCallback((date: Date) => {
    handleDateChange(date);
    handleViewChange('day');
  });

  const handleTimeSlotClick = useStableCallback((date: Date, resourceId?: string) => {
    if (readOnly) return;
    setSelectedEvent(null);
    setModalInitialDate(date);
    setModalInitialResourceId(resourceId);
    setIsModalOpen(true);
  });

  const handleEventClickInternal = useStableCallback((event: CalendarEvent) => {
    onEventClick?.(event);
    if (!readOnly) {
      setSelectedEvent(event);
      setModalInitialDate(undefined);
      setModalInitialResourceId(undefined);
      setIsModalOpen(true);
    }
  });

  const handleCreateEvent = useStableCallback(() => {
    if (readOnly) return;
    setSelectedEvent(null);
    setModalInitialDate(new Date());
    setModalInitialResourceId(undefined);
    setIsModalOpen(true);
  });

  const handleModalSave = useStableCallback((eventData: Partial<CalendarEvent>) => {
    if (selectedEvent?.originalEventId) {
      // R5: editing one occurrence updates the series, shifted by the same delta.
      const master = masterOf(selectedEvent);
      if (!master) return;
      const edited = {
        ...master,
        ...stripOccurrenceFields(eventData as CalendarEvent),
        id: master.id,
        start: master.start,
        end: master.end,
      };
      onEventUpdate?.(
        shiftSeries(edited, selectedEvent, eventData.start ?? selectedEvent.start, eventData.end ?? selectedEvent.end, timezone),
      );
    } else if (selectedEvent) {
      onEventUpdate?.({ ...eventData, id: selectedEvent.id } as CalendarEvent);
    } else {
      // A slot clicked in the resource view pre-assigns its resource.
      onEventCreate?.(
        modalInitialResourceId && eventData.resourceId === undefined
          ? { ...eventData, resourceId: modalInitialResourceId }
          : eventData,
      );
    }
  });

  /** R6: deleting an occurrence removes only that date when `onOccurrenceDelete` is provided. */
  const handleEventDelete = useStableCallback((event: CalendarEvent) => {
    if (!event.originalEventId) {
      onEventDelete?.(event.id);
      return;
    }
    const master = masterOf(event);
    if (onOccurrenceDelete && master) {
      onOccurrenceDelete(event, excludeOccurrence(master, event.occurrenceStart ?? event.start));
    } else {
      onEventDelete?.(event.originalEventId);
    }
  });

  const handleModalDelete = useStableCallback((eventId: string) => {
    if (selectedEvent && selectedEvent.id === eventId) {
      handleEventDelete(selectedEvent);
    } else {
      onEventDelete?.(eventId);
    }
  });

  /** R7: a duplicate is always a single event, one day later. */
  const handleEventDuplicate = useStableCallback((event: CalendarEvent) => {
    const { recurrence: _recurrence, ...copy } = stripOccurrenceFields(event);
    onEventCreate?.({
      ...copy,
      id: `${event.originalEventId ?? event.id}-copy-${Date.now()}`,
      title: `${event.title} (Copy)`,
      start: new Date(event.start.getTime() + DAY_MS),
      end: new Date(event.end.getTime() + DAY_MS),
    });
  });

  /** Applies new dates to an event, or to its whole series when it is an occurrence (R5, D1). */
  const applyChange = (event: CalendarEvent, start: Date, end: Date): { original: CalendarEvent; updated: CalendarEvent } | null => {
    if (!event.originalEventId) return { original: event, updated: { ...event, start, end } };
    const master = masterOf(event);
    if (!master) return null;
    return { original: master, updated: shiftSeries(master, event, start, end, timezone) };
  };

  const handleDragEnd = useStableCallback((dragEvent: DragEndEvent) => {
    const { active, over } = dragEvent;
    if (!over) return;
    const dragged = active.data.current?.event as CalendarEvent | undefined;
    const overDate = over.data.current?.date as Date | undefined;
    if (!dragged || !overDate) return;

    const drop = computeDrop({
      event: dragged,
      overDate,
      overResourceId: over.data.current?.resourceId,
      grabOffsetMs: active.data.current?.grabOffsetMs,
      view,
      tz: timezone,
    });
    if (!drop) return;

    const change = applyChange(dragged, drop.start, drop.end);
    if (!change) return;
    const updated = { ...change.updated, resourceId: drop.resourceId };
    // D2: onEventDrop is finally called, alongside onEventUpdate.
    onEventDrop?.(change.original, updated.start, updated.end);
    onEventUpdate?.(updated);
  });

  const handleEventResize = useStableCallback((event: CalendarEvent, newEnd: Date) => {
    if (readOnly) return;
    const change = applyChange(event, event.start, newEnd);
    if (!change) return;
    // Both callbacks are kept in 1.x for backwards compatibility (documented in the README).
    onEventResize?.(change.original, change.updated.start, change.updated.end);
    onEventUpdate?.(change.updated);
  });

  return {
    view,
    currentDate,
    isSidebarOpen,
    setIsSidebarOpen,
    isModalOpen,
    setIsModalOpen,
    selectedEvent,
    modalInitialDate,
    expandedEvents,
    handleViewChange,
    handleDateChange,
    handlePrev,
    handleNext,
    handleToday,
    handleDateClick,
    handleTimeSlotClick,
    handleEventClickInternal,
    handleCreateEvent,
    handleModalSave,
    handleModalDelete,
    handleEventDelete,
    handleEventDuplicate,
    handleEventResize,
    handleDragEnd
  };
};
