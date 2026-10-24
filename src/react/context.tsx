import React, { createContext, useContext } from 'react'
import type { CalendarStore } from 'calendarkit-pro/core'

const CalendarContext = createContext<CalendarStore | null>(null)

/** Makes a calendar store available to the components below, without passing it down. */
export function CalendarProvider({ calendar, children }: { calendar: CalendarStore; children?: React.ReactNode }) {
  return <CalendarContext.Provider value={calendar}>{children}</CalendarContext.Provider>
}

/** The store of the closest `<CalendarProvider>`. */
export function useCalendarContext(): CalendarStore {
  const calendar = useContext(CalendarContext)
  if (!calendar) throw new Error('useCalendarContext must be used inside a <CalendarProvider>.')
  return calendar
}
