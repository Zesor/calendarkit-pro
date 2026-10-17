import React from 'react';
import { format, isSameMonth, isSameDay, isToday, addMonths, subMonths, Locale } from 'date-fns';
import { getMonthGrid } from '../lib/date';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../utils';

import { ViewType } from '../types';

interface MiniCalendarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onViewChange?: (view: ViewType) => void;
  className?: string;
  locale?: Locale;
}

export const MiniCalendar: React.FC<MiniCalendarProps> = ({
  currentDate,
  onDateChange,
  onViewChange,
  className,
  locale
}) => {
  const [viewDate, setViewDate] = React.useState(currentDate);

  // Sync viewDate with currentDate when it changes externally
  React.useEffect(() => {
    setViewDate(currentDate);
  }, [currentDate]);

  // Week start follows the locale's convention (Sunday fallback, matching
  // the hardcoded initials below).
  const weekStartsOn = locale?.options?.weekStartsOn ?? 0;
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
    <div className={cn("px-4 w-[260px]", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-foreground capitalize">
          {format(viewDate, 'MMMM yyyy', { locale })}
        </span>
        <div className="flex items-center bg-muted/40 rounded-lg p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md hover:bg-background/80 transition-all"
              onClick={handlePrev}
              aria-label="Previous month"
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md hover:bg-background/80 transition-all"
              onClick={handleNext}
              aria-label="Next month"
            >
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-y-2 text-center mb-2">
        {weekDays.map((day, i) => (
          <div key={`${day}-${i}`} className="text-[10px] text-muted-foreground/70 font-semibold uppercase">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {days.map(day => {
          const isSelected = isSameDay(day, currentDate);
          const isCurrentMonth = isSameMonth(day, viewDate);
          const isTodayDate = isToday(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDateClick(day)}
              className={cn(
                "h-8 w-8 mx-auto flex items-center justify-center text-xs rounded-xl transition-all duration-200 font-medium",
                !isCurrentMonth && "text-muted-foreground/30",
                isCurrentMonth && !isSelected && !isTodayDate && "text-foreground hover:bg-accent/80",
                isSelected && "bg-primary text-primary-foreground shadow-md shadow-primary/30 scale-105",
                !isSelected && isTodayDate && "bg-primary/10 text-primary ring-1 ring-primary/30"
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
