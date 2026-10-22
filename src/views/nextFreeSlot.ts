import { addDays, addMinutes, startOfDay } from 'date-fns';

const STEP = 30;
const LENGTH = 60;

/**
 * Where "Create" puts a new one-hour event (wall-clock times of the display zone): the next half
 * hour from `now` that overlaps none of `events`, within the grid's hours; tomorrow's first hour
 * once today's are over. A day busy until the end keeps the first half hour.
 */
export function nextFreeSlot(now: Date, events: { start: Date; end: Date }[], startHour: number, endHour: number): Date {
  const day = startOfDay(now);
  const minutes = Math.max(Math.ceil((now.getTime() - day.getTime()) / 60000 / STEP) * STEP, startHour * 60);
  if (minutes + LENGTH > endHour * 60) return addMinutes(addDays(day, 1), startHour * 60);
  const first = addMinutes(day, minutes);
  for (let start = first; addMinutes(start, LENGTH) <= addMinutes(day, endHour * 60); start = addMinutes(start, STEP)) {
    const end = addMinutes(start, LENGTH);
    if (!events.some((event) => event.start < end && event.end > start)) return start;
  }
  return first;
}
