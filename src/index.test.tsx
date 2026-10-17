import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import * as publicApi from './index'
import { Scheduler } from './index'
import type {
  CalendarEvent,
  CalendarProps,
  CalendarTheme,
  CalendarTranslations,
  EventAttachment,
  EventReminder,
  EventType,
  Resource,
  ThemeColors,
  ViewType,
} from './index'

afterEach(cleanup)

// Compile-time guard (checked by `npm run typecheck`): fails if a public type disappears.
type _PublicTypes = [
  CalendarEvent,
  CalendarProps,
  CalendarTheme,
  CalendarTranslations,
  EventAttachment,
  EventReminder,
  EventType,
  Resource,
  ThemeColors,
  ViewType,
]

// Compile-time guard: fails if any of these CalendarProps keys is removed or renamed.
const calendarPropKeys: Array<keyof CalendarProps> = [
  'events', 'translations', 'view', 'onViewChange', 'date', 'onDateChange',
  'onEventClick', 'onEventDrop', 'onEventResize', 'onEventCreate', 'onEventUpdate',
  'onEventDelete', 'theme', 'locale', 'timezone', 'onTimezoneChange', 'className',
  'readOnly', 'calendars', 'resources', 'eventTypes', 'onCalendarToggle', 'isLoading',
  'isDarkMode', 'onThemeToggle', 'hideViewSwitcher', 'language', 'onLanguageChange',
  'renderEventForm',
]

describe('public API', () => {
  test('runtime exports are exactly Scheduler and cn', () => {
    expect(Object.keys(publicApi).sort()).toEqual(['Scheduler', 'cn'])
  })

  test('CalendarProps keeps its 29 documented props', () => {
    expect(new Set(calendarPropKeys).size).toBe(29)
  })
})

describe('Scheduler smoke render', () => {
  test('renders the month view without crashing', () => {
    render(<Scheduler events={[]} view="month" date={new Date(2026, 9, 15)} />)
    expect(screen.getAllByText(/october 2026/i).length).toBeGreaterThan(0)
  })
})
