import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import { renderToString } from 'react-dom/server'
import { resolveTranslations } from '../core/format'
import { Sidebar } from './Sidebar'
import { CalendarHeader } from './CalendarHeader'
import { MonthViewSkeleton } from './Skeleton'

afterEach(cleanup)

const en = resolveTranslations('en')
const fr = resolveTranslations('fr')
const date = new Date(2026, 9, 15)

describe('Sidebar', () => {
  test('U1: without `calendars`, no placeholder calendars are shown', () => {
    render(<Sidebar currentDate={date} onDateChange={() => {}} translations={en} />)
    expect(screen.queryByText('Calendars')).toBeNull()
    expect(screen.queryByText('My Calendar')).toBeNull()
  })

  test('the provided calendars are listed', () => {
    render(<Sidebar currentDate={date} onDateChange={() => {}} translations={en} calendars={[{ id: 'w', label: 'Work', color: '#3b82f6' }]} />)
    expect(screen.getByText('Calendars')).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: 'Work' })).toBeTruthy()
  })

  test('U5: a malicious colour is not injected into a <style> tag', () => {
    const { container } = render(
      <Sidebar currentDate={date} onDateChange={() => {}} translations={en} calendars={[{ id: 'x', label: 'X', color: 'red; } body { display: none' }]} />,
    )
    expect(container.querySelector('style')).toBeNull()
    const holder = screen.getByRole('checkbox', { name: 'X' }).parentElement as HTMLElement
    expect(holder.style.getPropertyValue('--cal-color')).toBe('var(--ck-primary)')
  })
})

describe('CalendarHeader', () => {
  test('A1: icon-only buttons have translated accessible names and the active view is pressed', () => {
    render(
      <CalendarHeader
        currentDate={date} onPrev={() => {}} onNext={() => {}} onToday={() => {}} view="week" onViewChange={() => {}}
        onMenuClick={() => {}} onThemeToggle={() => {}} translations={fr} language="fr" onLanguageChange={() => {}}
      />,
    )
    for (const name of ['Précédent', 'Suivant', 'Afficher ou masquer la barre latérale', 'Basculer le thème sombre', 'Changer de langue']) {
      expect(screen.getByRole('button', { name })).toBeTruthy()
    }
    expect(screen.getByRole('button', { name: 'Semaine' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Mois' }).getAttribute('aria-pressed')).toBe('false')
  })
})

describe('MonthViewSkeleton', () => {
  test('renders the same markup twice (no Math.random, so SSR hydration matches)', () => {
    expect(renderToString(<MonthViewSkeleton />)).toBe(renderToString(<MonthViewSkeleton />))
  })
})

describe('MiniCalendar labels', () => {
  test('month navigation buttons use the translations', () => {
    render(<Sidebar currentDate={date} onDateChange={() => {}} translations={fr} />)
    const nav = screen.getByRole('button', { name: 'Mois précédent' })
    expect(within(nav.parentElement as HTMLElement).getByRole('button', { name: 'Mois suivant' })).toBeTruthy()
  })
})
