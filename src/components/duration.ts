import { interpolate } from '../core/format';
import type { CalendarTranslations } from '../types';

/** "30 min", "1 hr", "1 hr 30 min" in the calendar's language. */
export function durationLabel(minutes: number, t: CalendarTranslations) {
  if (minutes < 60) return interpolate(t.durationMinutes, { n: minutes });
  return minutes % 60 ? interpolate(t.durationHoursMinutes, { h: Math.floor(minutes / 60), m: minutes % 60 }) : interpolate(t.durationHours, { n: minutes / 60 });
}
