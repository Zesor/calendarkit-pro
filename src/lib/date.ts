import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
  format,
  Locale,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays as addDaysFns,
  subDays
} from 'date-fns';

export const getMonthGrid = (date: Date, weekStartOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 0): Date[] => {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(monthStart);
  
  const startDate = startOfWeek(monthStart, { weekStartsOn: weekStartOn });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: weekStartOn });

  const dateFormat = 'd';
  const rows = [];
  let days = [];
  let day = startDate;
  let formattedDate = '';

  const grid: Date[] = [];

  // If the grid needs to always show 6 weeks (42 days) to be consistent
  // const totalDays = 42; 
  // But eachDayOfInterval is easier.
  
  return eachDayOfInterval({
    start: startDate,
    end: endDate
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

export const getWeekDays = (date: Date, weekStartOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 0): Date[] => {
  const start = startOfWeek(date, { weekStartsOn: weekStartOn });
  const end = endOfWeek(date, { weekStartsOn: weekStartOn });
  return eachDayOfInterval({ start, end });
};

export const getTimeSlots = (startHour: number = 0, endHour: number = 24, intervalMinutes: number = 30): Date[] => {
  // This might return just simple objects or dates relative to a base
  // For rendering the y-axis, we just need the labels usually.
  // But for the grid, we might need slots.
  
  // Simplified for now: return strings or just numbers
  return []; 
};

export {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  isToday,
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDaysFns,
  subDays
};
