import React from 'react';
import { format, Locale } from 'date-fns';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight, Menu, Moon, Sun, CalendarDays, CalendarRange, Calendar, ListTodo } from './icons';
import { ViewType } from '../types';
import { cx } from '../utils';

interface CalendarHeaderProps {
  currentDate: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  view: ViewType;
  onViewChange: (view: ViewType) => void;
  onMenuClick?: () => void;
  isDarkMode?: boolean;
  onThemeToggle?: () => void;
  translations: any;
  hideViewSwitcher?: boolean;
  language?: 'en' | 'fr';
  onLanguageChange?: (lang: 'en' | 'fr') => void;
  locale?: Locale;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentDate,
  onPrev,
  onNext,
  onToday,
  view,
  onViewChange,
  onMenuClick,
  isDarkMode,
  onThemeToggle,
  translations,
  hideViewSwitcher,
  language,
  onLanguageChange,
  locale
}) => {
  const viewConfig = [
    { key: 'month', icon: CalendarDays },
    { key: 'week', icon: CalendarRange },
    { key: 'day', icon: Calendar },
    { key: 'agenda', icon: ListTodo },
  ] as const;

  return (
    <div className="flex flex-col md:flex-row items-center justify-between px-3 md:px-5 py-3 border-b-[0px] border-border/50 bg-gradient-to-r from-background via-background to-muted/20 gap-3 md:gap-0 min-h-[64px]">
      {/* Left Section: Menu, Navigation, Title */}
      <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-start">
        <div className="flex items-center gap-2 md:gap-3">
            {/* Menu Button */}
            <Button
              className="text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/80 rounded-xl h-10 w-10 hidden md:inline-flex transition-all duration-200"
              onClick={onMenuClick}
              aria-label={translations.toggleSidebar}
            >
                <Menu className="h-5 w-5" />
            </Button>

            {/* Today Button */}
            <Button
              onClick={onToday}
              className="bg-background h-9 px-5 rounded-xl text-sm font-medium hidden sm:inline-flex border-[0.5px] border-border/60 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all duration-200"
            >
                {translations.today}
            </Button>

            {/* Navigation Arrows */}
            <div className="flex items-center bg-muted/40 rounded-xl p-0.5">
                <Button
                  onClick={onPrev}
                  className="inline-flex text-sm font-medium hover:text-accent-foreground rounded-lg h-8 w-8 hover:bg-background/80 transition-all duration-200"
                  aria-label={translations.previous}
                >
                    <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button
                  onClick={onNext}
                  className="inline-flex text-sm font-medium hover:text-accent-foreground rounded-lg h-8 w-8 hover:bg-background/80 transition-all duration-200"
                  aria-label={translations.next}
                >
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Button>
            </div>

            {/* Current Date Display */}
            <div className="ml-2 md:ml-4">
                <h2 className="text-lg md:text-xl font-semibold text-foreground whitespace-nowrap capitalize tracking-tight">
                    {format(currentDate, 'MMMM yyyy', { locale })}
                </h2>
            </div>
        </div>
      </div>

      {/* Right Section: View Switcher & Theme Toggle */}
      <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto justify-end">
        {/* Language Toggle */}
        {onLanguageChange && language && (
          <Button
            onClick={() => onLanguageChange(language === 'en' ? 'fr' : 'en')}
            aria-label={translations.switchLanguage}
            className="inline-flex h-9 px-3 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent/80 transition-all duration-200 uppercase tracking-wider"
          >
            {language}
          </Button>
        )}

        {/* Theme Toggle */}
        {onThemeToggle && (
          <Button
            className="inline-flex text-sm font-medium hover:text-accent-foreground rounded-xl h-9 w-9 hover:bg-accent/80 transition-all duration-200"
            onClick={onThemeToggle}
            aria-label={translations.toggleTheme}
          >
            {isDarkMode ? (
              <Sun className="h-4 w-4 text-amber-500" />
            ) : (
              <Moon className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        )}

        {/* View Switcher */}
        {!hideViewSwitcher && (
          <div className="flex items-center bg-muted/50 backdrop-blur-sm rounded-xl p-1">
            {viewConfig.map(({ key, icon: Icon }) => (
              <Button
                key={key}
                onClick={() => onViewChange(key)}
                aria-pressed={view === key}
                aria-label={translations[key]}
                className={cx(
                  "inline-flex font-medium h-8 px-3 text-xs rounded-lg transition-all duration-200 gap-1.5",
                  view === key
                    ? "hover:bg-accent hover:text-accent-foreground bg-background shadow-sm text-foreground border-[0.5px] border-border/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{translations[key]}</span>
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
