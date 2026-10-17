import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, Locale } from 'date-fns';

type WeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const getMonthGrid = (date: Date, weekStartOn: WeekStartsOn = 0): Date[] => {
  const monthStart = startOfMonth(date);
  return eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: weekStartOn }),
    end: endOfWeek(endOfMonth(monthStart), { weekStartsOn: weekStartOn }),
  });
};

/**
 * Whether the locale renders times on a 24-hour clock (fr, pt-BR, de, ...).
 * Detected from the locale's own localized time pattern instead of
 * hardcoding language codes. Defaults to false (12h) without a locale.
 */
export const uses24HourClock = (locale?: Locale): boolean => {
  if (!locale) return false;
  return !/[ap]\.?m/i.test(format(new Date(2000, 0, 1, 13, 0), 'p', { locale }));
};
