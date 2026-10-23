import React from 'react';
import { format, isSameMonth, isSameDay, isToday, addMonths, subMonths, Locale } from 'date-fns';
import { getMonthGrid, resolveWeekStartsOn } from '../core/week';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight } from './icons';
import { cx } from '../utils';

import { ViewType } from '../types';

interface MiniCalendarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onViewChange?: (view: ViewType) => void;
  className?: string;
  locale?: Locale;
  labels?: { previousMonth?: string; nextMonth?: string };
}

export const MiniCalendar: React.FC<MiniCalendarProps> = ({
  currentDate,
  onDateChange,
  onViewChange,
  className,
  locale,
  labels
}) => {
  const [viewDate, setViewDate] = React.useState(currentDate);

  // Sync viewDate with currentDate when it changes externally
  React.useEffect(() => {
    setViewDate(currentDate);
  }, [currentDate]);

  // Week start follows the locale's convention (Sunday fallback, matching
  // the hardcoded initials below).
  const weekStartsOn = resolveWeekStartsOn(locale, 0);
  const days = React.useMemo(
    () => getMonthGrid(viewDate, weekStartsOn),
    [viewDate, weekStartsOn],
  );
  const weekDays = locale?.localize
    ? [0, 1, 2, 3, 4, 5, 6].map(d => {
        const dayIndex = ((d + weekStartsOn) % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
        return locale.localize.day(dayIndex, { width: 'narrow' });
      })
    : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const handlePrev = () => {
    const newDate = subMonths(viewDate, 1);
    setViewDate(newDate);
    // Optional: if user wants to sync main calendar on arrow click, uncomment:
    onDateChange(newDate);
    if (onViewChange) onViewChange('month');
  };

  const handleNext = () => {
    const newDate = addMonths(viewDate, 1);
    setViewDate(newDate);
    // Optional: if user wants to sync main calendar on arrow click, uncomment:
    onDateChange(newDate);
    if (onViewChange) onViewChange('month');
  };
  
  const handleDateClick = (day: Date) => {
      onDateChange(day);
      if (onViewChange) onViewChange('day');
  };

  return (
    <div className={cx("ck:px-4 ck:w-[260px]", className)}>
      {/* Header */}
      <div className="ck:flex ck:items-center ck:justify-between ck:mb-4">
        <span className="ck:text-sm ck:font-semibold ck:text-foreground ck:capitalize">
          {format(viewDate, 'MMMM yyyy', { locale })}
        </span>
        <div className="ck:flex ck:items-center ck:bg-muted/40 ck:rounded-lg ck:p-0.5">
            <Button
              className="ck:inline-flex ck:text-sm ck:font-medium ck:hover:text-accent-foreground ck:h-7 ck:w-7 ck:rounded-md ck:hover:bg-background/80 ck:transition-all"
              onClick={handlePrev}
              aria-label={labels?.previousMonth || 'Previous month'}
            >
                <ChevronLeft className="ck:h-4 ck:w-4" />
            </Button>
            <Button
              className="ck:inline-flex ck:text-sm ck:font-medium ck:hover:text-accent-foreground ck:h-7 ck:w-7 ck:rounded-md ck:hover:bg-background/80 ck:transition-all"
              onClick={handleNext}
              aria-label={labels?.nextMonth || 'Next month'}
            >
                <ChevronRight className="ck:h-4 ck:w-4" />
            </Button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="ck:grid ck:grid-cols-7 ck:gap-y-2 ck:text-center ck:mb-2">
        {weekDays.map((day, i) => (
          <div key={`${day}-${i}`} className="ck:text-[10px] ck:text-muted-foreground/70 ck:font-semibold ck:uppercase">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="ck:grid ck:grid-cols-7 ck:gap-y-1 ck:text-center">
        {days.map(day => {
          const isSelected = isSameDay(day, currentDate);
          const isCurrentMonth = isSameMonth(day, viewDate);
          const isTodayDate = isToday(day);

          return (
            <button
              key={day.toISOString()}
              type="button"
              aria-label={format(day, 'EEEE d MMMM yyyy', { locale })}
              aria-pressed={isSelected}
              onClick={() => handleDateClick(day)}
              className={cx(
                "ck:h-8 ck:w-8 ck:mx-auto ck:flex ck:items-center ck:justify-center ck:text-xs ck:rounded-xl ck:transition-all ck:duration-200 ck:font-medium",
                !isCurrentMonth && "ck:text-muted-foreground/30",
                isCurrentMonth && !isSelected && !isTodayDate && "ck:text-foreground ck:hover:bg-accent/80",
                isSelected && "ck:bg-primary ck:text-primary-foreground ck:shadow-md ck:shadow-primary/30 ck:scale-105",
                !isSelected && isTodayDate && "ck:bg-primary/10 ck:text-primary ck:ring-1 ck:ring-primary/30"
              )}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
};
