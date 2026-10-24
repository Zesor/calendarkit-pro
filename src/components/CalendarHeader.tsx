import React from 'react';
import { format, Locale } from 'date-fns';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight, Menu, Moon, Sun, CalendarDays, CalendarRange, Calendar, ListTodo } from './icons';
import { ViewType } from '../types';
import { cx } from '../utils';
import { useClassNames } from './customize';

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
  /** Phone layout (spec §8.9): two rows, menu and Today always shown, 44 px targets. */
  compact?: boolean;
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
  locale,
  compact
}) => {
  const viewConfig = [
    { key: 'month', icon: CalendarDays },
    { key: 'week', icon: CalendarRange },
    { key: 'day', icon: Calendar },
    { key: 'agenda', icon: ListTodo },
  ] as const;

  const classNames = useClassNames();
  if (compact) {
    const tap = "ck:inline-flex ck:min-h-11 ck:min-w-11 ck:rounded-xl ck:text-muted-foreground ck:hover:bg-accent/80 ck:hover:text-foreground";
    return (
      <div className={cx("ck:flex ck:flex-col ck:gap-1 ck:px-2 ck:py-2", classNames.toolbar)}>
        <div className="ck:flex ck:items-center ck:gap-1">
          <Button className={tap} onClick={onMenuClick} aria-label={translations.toggleSidebar}><Menu className="ck:h-5 ck:w-5" /></Button>
          <h2 className="ck:min-w-0 ck:flex-1 ck:truncate ck:px-1 ck:text-lg ck:font-semibold ck:capitalize ck:tracking-tight ck:text-foreground">{format(currentDate, 'MMM yyyy', { locale })}</h2>
          <Button onClick={onToday} className="ck:inline-flex ck:min-h-11 ck:rounded-xl ck:border-[0.5px] ck:border-border/60 ck:px-3 ck:text-sm ck:font-medium">{translations.today}</Button>
          <Button className={tap} onClick={onPrev} aria-label={translations.previous}><ChevronLeft className="ck:h-5 ck:w-5" /></Button>
          <Button className={tap} onClick={onNext} aria-label={translations.next}><ChevronRight className="ck:h-5 ck:w-5" /></Button>
        </div>
        {(!hideViewSwitcher || onThemeToggle || (onLanguageChange && language)) && (
          <div className="ck:flex ck:items-center ck:gap-1">
            {onLanguageChange && language && (
              <Button onClick={() => onLanguageChange(language === 'en' ? 'fr' : 'en')} aria-label={translations.switchLanguage} className={cx(tap, "ck:px-2 ck:text-xs ck:font-semibold ck:uppercase")}>{language}</Button>
            )}
            {onThemeToggle && (
              <Button className={tap} onClick={onThemeToggle} aria-label={translations.toggleTheme}>
                {isDarkMode ? <Sun className="ck:h-5 ck:w-5 ck:text-warning" /> : <Moon className="ck:h-5 ck:w-5" />}
              </Button>
            )}
            {!hideViewSwitcher && (
              <div className="ck:ml-auto ck:flex ck:flex-1 ck:rounded-xl ck:bg-muted/50 ck:p-0.5">
                {viewConfig.map(({ key, icon: Icon }) => (
                  <Button
                    key={key}
                    onClick={() => onViewChange(key)}
                    aria-pressed={view === key}
                    aria-label={translations[key]}
                    className={cx("ck:inline-flex ck:min-h-11 ck:flex-1 ck:rounded-lg", view === key ? "ck:bg-background ck:text-foreground ck:shadow-xs" : "ck:text-muted-foreground")}
                  >
                    <Icon className="ck:h-4 ck:w-4" />
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className={cx("ck:flex ck:flex-col ck:md:flex-row ck:items-center ck:justify-between ck:px-3 ck:md:px-5 ck:py-3 ck:border-b-[0px] ck:border-border/50 ck:bg-linear-to-r ck:from-background ck:via-background ck:to-muted/20 ck:gap-3 ck:md:gap-0 ck:min-h-[64px]", classNames.toolbar)}>
      {/* Left Section: Menu, Navigation, Title */}
      <div className="ck:flex ck:items-center ck:gap-2 ck:w-full ck:md:w-auto ck:justify-between ck:md:justify-start">
        <div className="ck:flex ck:items-center ck:gap-2 ck:md:gap-3">
            {/* Menu Button */}
            <Button
              className="ck:text-sm ck:font-medium ck:text-muted-foreground ck:hover:text-foreground ck:hover:bg-accent/80 ck:rounded-xl ck:h-10 ck:w-10 ck:hidden ck:md:inline-flex ck:transition-all ck:duration-200"
              onClick={onMenuClick}
              aria-label={translations.toggleSidebar}
            >
                <Menu className="ck:h-5 ck:w-5" />
            </Button>

            {/* Today Button */}
            <Button
              onClick={onToday}
              className="ck:bg-background ck:h-9 ck:px-5 ck:rounded-xl ck:text-sm ck:font-medium ck:hidden ck:sm:inline-flex ck:border-[0.5px] ck:border-border/60 ck:hover:border-primary/40 ck:hover:bg-primary/5 ck:hover:text-primary ck:transition-all ck:duration-200"
            >
                {translations.today}
            </Button>

            {/* Navigation Arrows */}
            <div className="ck:flex ck:items-center ck:bg-muted/40 ck:rounded-xl ck:p-0.5">
                <Button
                  onClick={onPrev}
                  className="ck:inline-flex ck:text-sm ck:font-medium ck:hover:text-accent-foreground ck:rounded-lg ck:h-8 ck:w-8 ck:hover:bg-background/80 ck:transition-all ck:duration-200"
                  aria-label={translations.previous}
                >
                    <ChevronLeft className="ck:h-4 ck:w-4 ck:text-muted-foreground" />
                </Button>
                <Button
                  onClick={onNext}
                  className="ck:inline-flex ck:text-sm ck:font-medium ck:hover:text-accent-foreground ck:rounded-lg ck:h-8 ck:w-8 ck:hover:bg-background/80 ck:transition-all ck:duration-200"
                  aria-label={translations.next}
                >
                    <ChevronRight className="ck:h-4 ck:w-4 ck:text-muted-foreground" />
                </Button>
            </div>

            {/* Current Date Display */}
            <div className="ck:ml-2 ck:md:ml-4">
                <h2 className="ck:text-lg ck:md:text-xl ck:font-semibold ck:text-foreground ck:whitespace-nowrap ck:capitalize ck:tracking-tight">
                    {format(currentDate, 'MMMM yyyy', { locale })}
                </h2>
            </div>
        </div>
      </div>

      {/* Right Section: View Switcher & Theme Toggle */}
      <div className="ck:flex ck:items-center ck:gap-2 ck:md:gap-3 ck:w-full ck:md:w-auto ck:justify-end">
        {/* Language Toggle */}
        {onLanguageChange && language && (
          <Button
            onClick={() => onLanguageChange(language === 'en' ? 'fr' : 'en')}
            aria-label={translations.switchLanguage}
            className="ck:inline-flex ck:h-9 ck:px-3 ck:rounded-xl ck:text-xs ck:font-semibold ck:text-muted-foreground ck:hover:text-foreground ck:hover:bg-accent/80 ck:transition-all ck:duration-200 ck:uppercase ck:tracking-wider"
          >
            {language}
          </Button>
        )}

        {/* Theme Toggle */}
        {onThemeToggle && (
          <Button
            className="ck:inline-flex ck:text-sm ck:font-medium ck:hover:text-accent-foreground ck:rounded-xl ck:h-9 ck:w-9 ck:hover:bg-accent/80 ck:transition-all ck:duration-200"
            onClick={onThemeToggle}
            aria-label={translations.toggleTheme}
          >
            {isDarkMode ? (
              <Sun className="ck:h-4 ck:w-4 ck:text-warning" />
            ) : (
              <Moon className="ck:h-4 ck:w-4 ck:text-muted-foreground" />
            )}
          </Button>
        )}

        {/* View Switcher */}
        {!hideViewSwitcher && (
          <div className="ck:flex ck:items-center ck:bg-muted/50 ck:backdrop-blur-xs ck:rounded-xl ck:p-1">
            {viewConfig.map(({ key, icon: Icon }) => (
              <Button
                key={key}
                onClick={() => onViewChange(key)}
                aria-pressed={view === key}
                aria-label={translations[key]}
                className={cx(
                  "ck:inline-flex ck:font-medium ck:h-8 ck:px-3 ck:text-xs ck:rounded-lg ck:transition-all ck:duration-200 ck:gap-1.5",
                  view === key
                    ? "ck:hover:bg-accent ck:hover:text-accent-foreground ck:bg-background ck:shadow-xs ck:text-foreground ck:border-[0.5px] ck:border-border/50"
                    : "ck:text-muted-foreground ck:hover:text-foreground ck:hover:bg-background/50"
                )}
              >
                <Icon className="ck:h-3.5 ck:w-3.5" />
                <span className="ck:hidden ck:sm:inline">{translations[key]}</span>
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
