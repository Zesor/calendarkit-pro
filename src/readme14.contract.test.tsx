// 1.x contract (spec §12): every example of the 1.4.1 README, as written there, still renders and
// behaves in 2.0. One test per example; the code is the README's, the asserts are its promises.
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { fr } from 'date-fns/locale'
import React, { useState } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { Scheduler } from './index'
import type { CalendarEvent, Resource, ViewType } from './index'

afterEach(cleanup)

const oct14 = new Date(2026, 9, 14)

describe('1.4.1 README examples', () => {
  test('Quick start: controlled events, view and date; create, then delete', async () => {
    function MyCalendar() {
      const [events, setEvents] = useState<CalendarEvent[]>([])
      const [view, setView] = useState<ViewType>('week')
      const [date, setDate] = useState(oct14)
      return (
        <Scheduler
          events={events}
          view={view}
          onViewChange={setView}
          date={date}
          onDateChange={setDate}
          onEventCreate={(event) => {
            setEvents([...events, { ...event, id: crypto.randomUUID() } as CalendarEvent])
          }}
          onEventUpdate={(event) => {
            setEvents(events.map((e) => (e.id === event.id ? event : e)))
          }}
          onEventDelete={(id) => {
            setEvents(events.filter((e) => e.id !== id))
          }}
        />
      )
    }
    render(<MyCalendar />)
    act(() => screen.getByRole('button', { name: 'Day' }).click())
    expect(screen.getByRole('button', { name: 'Day', pressed: true })).toBeTruthy()
    act(() => screen.getByRole('button', { name: 'Create an event on Wednesday 14 October at 9:00 AM' }).click())
    fireEvent.change(within(screen.getByRole('dialog')).getAllByRole('textbox')[0], { target: { value: 'Lunch' } })
    act(() => within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }).click())
    const lunch = screen.getByRole('button', { name: /^Lunch, Wednesday 14 October/ })
    act(() => lunch.click())
    act(() => within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }).click())
    expect(screen.queryByRole('button', { name: /^Lunch/ })).toBeNull()
  })

  test('All-day and multi-day events: an exclusive all-day end and a 24 h+ flight are bars', () => {
    const events = [
      { id: 'offsite', title: 'Offsite', start: new Date(2026, 9, 12), end: new Date(2026, 9, 15), allDay: true },
      { id: 'flight', title: 'Flight', start: new Date(2026, 9, 14, 22), end: new Date(2026, 9, 16, 4) },
    ]
    render(<Scheduler events={events} view="week" date={oct14} />)
    expect(screen.getByRole('button', { name: /^Offsite, Monday 12 October to Wednesday 14 October/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Flight/ }).closest('[data-ck-drag]')!.querySelector('.ck-event-bar')).not.toBeNull()
  })

  test('Recurring events: a weekly series with a count shows on each week', () => {
    const recurringEvent: CalendarEvent = {
      id: '1',
      title: 'Weekly Standup',
      start: new Date(2026, 9, 5, 9),
      end: new Date(2026, 9, 5, 10),
      recurrence: { freq: 'WEEKLY', interval: 1, count: 10 },
    }
    render(<Scheduler events={[recurringEvent]} view="month" date={oct14} />)
    expect(screen.getAllByRole('button', { name: /^Weekly Standup/ })).toHaveLength(4)
  })

  test('onOccurrenceDelete: deleting one occurrence hands back the updated series', () => {
    const series: CalendarEvent = { id: 's', title: 'Standup', start: new Date(2026, 9, 5, 9), end: new Date(2026, 9, 5, 10), recurrence: { freq: 'WEEKLY' } }
    const spy = vi.fn()
    function App() {
      const [events, setEvents] = useState<CalendarEvent[]>([series])
      return (
        <Scheduler
          events={events}
          view="week"
          date={oct14}
          onOccurrenceDelete={(occurrence, updatedSeries) => {
            spy(occurrence, updatedSeries)
            setEvents(events.map((e) => (e.id === updatedSeries.id ? updatedSeries : e)))
          }}
        />
      )
    }
    render(<App />)
    act(() => screen.getByRole('button', { name: /^Standup/ }).click())
    act(() => within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }).click())
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][1].id).toBe('s')
    expect(screen.queryByRole('button', { name: /^Standup/ })).toBeNull()
  })

  test('Timezone support: timezone and onTimezoneChange', () => {
    const onTimezoneChange = vi.fn()
    render(<Scheduler timezone="Europe/Paris" onTimezoneChange={onTimezoneChange} view="week" date={oct14} />)
    act(() => screen.getByRole('button', { name: /Paris/ }).click())
    act(() => screen.getByText(/New York/).click())
    expect(onTimezoneChange).toHaveBeenCalledWith('America/New_York')
  })

  test('Internationalization: language, date-fns locale and partial translations', () => {
    const frenchTranslations = { today: "Aujourd'hui", month: 'Mois', week: 'Semaine', day: 'Jour', agenda: 'Agenda', createEvent: 'Créer un événement' }
    render(<Scheduler language="fr" locale={fr} translations={frenchTranslations} view="week" date={oct14} />)
    // Shown from the sm breakpoint (a media query jsdom does not evaluate).
    expect(screen.getByText("Aujourd'hui", { selector: 'button' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Semaine', pressed: true })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'octobre 2026', level: 2 })).toBeTruthy()
  })

  test('Theming: isDarkMode, onThemeToggle and a theme object', () => {
    function App() {
      const [darkMode, setDarkMode] = useState(false)
      return (
        <Scheduler
          isDarkMode={darkMode}
          onThemeToggle={() => setDarkMode(!darkMode)}
          theme={{ colors: { primary: '#3b82f6', background: '#ffffff', foreground: '#1a1a1a' }, fontFamily: 'Inter, sans-serif', borderRadius: '12px' }}
          view="week"
          date={oct14}
        />
      )
    }
    const { container } = render(<App />)
    const root = container.querySelector('.ck-root') as HTMLElement
    expect(root.style.getPropertyValue('--ck-primary')).not.toBe('')
    expect(root.getAttribute('data-ck-mode')).toBe('light')
    act(() => screen.getByRole('button', { name: 'Toggle dark mode' }).click())
    expect(root.getAttribute('data-ck-mode')).toBe('dark')
  })

  test('Resource scheduling: one row per resource', () => {
    const resources: Resource[] = [
      { id: 'room-a', label: 'Conference Room A', color: '#3b82f6' },
      { id: 'room-b', label: 'Conference Room B', color: '#10b981' },
    ]
    const events: CalendarEvent[] = [{ id: 'm', title: 'Meeting', start: new Date(2026, 9, 14, 10), end: new Date(2026, 9, 14, 11), resourceId: 'room-b' }]
    render(<Scheduler view="resource" resources={resources} events={events} date={oct14} />)
    expect(screen.getByText('Conference Room A')).toBeTruthy()
    expect(screen.getByText('Conference Room B')).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Meeting/ })).toBeTruthy()
  })

  test('Multiple calendars: calendars and onCalendarToggle', () => {
    const calendars = [
      { id: 'work', label: 'Work', color: '#3b82f6', active: true },
      { id: 'personal', label: 'Personal', color: '#10b981', active: true },
    ]
    const onCalendarToggle = vi.fn()
    render(<Scheduler calendars={calendars} onCalendarToggle={onCalendarToggle} view="week" date={oct14} />)
    act(() => screen.getByRole('checkbox', { name: 'Personal' }).click())
    expect(onCalendarToggle).toHaveBeenCalledWith('personal', false)
  })

  test('Custom event form: renderEventForm opens for a new event', () => {
    const MyCustomForm = ({ open, event }: { open: boolean; event?: CalendarEvent | null; onClose: () => void; onSave: unknown; onDelete?: unknown }) => (open ? <div role="dialog" aria-label="My form">{event ? event.title : 'new'}</div> : null)
    render(
      <Scheduler
        view="day"
        date={oct14}
        renderEventForm={({ isOpen, onClose, event, onSave, onDelete }) => (
          <MyCustomForm open={isOpen} onClose={onClose} event={event} onSave={onSave} onDelete={onDelete} />
        )}
      />,
    )
    act(() => screen.getByRole('button', { name: 'Create an event on Wednesday 14 October at 9:00 AM' }).click())
    expect(screen.getByRole('dialog', { name: 'My form' }).textContent).toBe('new')
  })
})
