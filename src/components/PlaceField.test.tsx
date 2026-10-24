// Spec §8.7: with `placeSearch`, the form's Location field suggests places as you type; a chosen
// place is saved with its coordinates and opens in Maps or as directions.
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { startOfDay } from 'date-fns'
import React from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { resolveTranslations } from '../core/format'
import { Scheduler } from '../index'
import type { CalendarEvent, Place, PlaceSearch } from '../types'
import { EventModal } from './EventModal'
import { todayAt } from '../test/time'

afterEach(cleanup)

const en = resolveTranslations('en')
const flore: Place = { name: 'Café de Flore', address: '172 Boulevard Saint-Germain, Paris', lat: 48.854, lon: 2.3326 }
const start = new Date(2026, 9, 15, 9, 0)
const open = (placeSearch?: PlaceSearch, onSave = vi.fn()) => {
  render(<EventModal isOpen onClose={() => {}} onSave={onSave} initialDate={start} translations={en} placeSearch={placeSearch} />)
  return onSave
}
const location = () => screen.getByLabelText('Location') as HTMLInputElement

describe('place search in the form', () => {
  test('suggestions as you type; a chosen place is saved with its coordinates and shown with Open in Maps and Directions', async () => {
    const search = vi.fn<PlaceSearch>().mockResolvedValue([flore, { ...flore }])
    const onSave = open(search)
    fireEvent.change(screen.getByLabelText('Add title'), { target: { value: 'Coffee' } })
    fireEvent.change(location(), { target: { value: 'Flore' } })
    const option = await screen.findByRole('option', { name: /Café de Flore/ })
    expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(1)
    expect(location().getAttribute('aria-expanded')).toBe('true')
    act(() => option.click())
    expect(location().value).toBe('Café de Flore, 172 Boulevard Saint-Germain, Paris')
    expect(screen.getByRole('link', { name: /Open in maps/ }).getAttribute('href')).toBe('https://www.google.com/maps/search/?api=1&query=48.854%2C2.3326')
    expect(screen.getByRole('link', { name: /Directions/ }).getAttribute('href')).toBe('https://www.google.com/maps/dir/?api=1&destination=48.854%2C2.3326')
    fireEvent.submit(location().closest('form')!)
    expect(onSave.mock.calls[0][0]).toMatchObject({ place: flore, location: 'Café de Flore, 172 Boulevard Saint-Germain, Paris' })
  })

  test('no result, and a provider that fails, are said plainly; the typed text is kept', async () => {
    open(vi.fn<PlaceSearch>().mockResolvedValue([]))
    fireEvent.change(location(), { target: { value: 'Nowhere' } })
    await vi.waitFor(() => expect(screen.getByRole('status').textContent).toBe('No places found'))
    cleanup()
    const onSave = open(vi.fn<PlaceSearch>().mockRejectedValue(new Error('down')))
    fireEvent.change(screen.getByLabelText('Add title'), { target: { value: 'Coffee' } })
    fireEvent.change(location(), { target: { value: 'Somewhere' } })
    await vi.waitFor(() => expect(screen.getByRole('status').textContent).toBe('Place search is unavailable'))
    fireEvent.submit(location().closest('form')!)
    expect(onSave.mock.calls[0][0]).toMatchObject({ location: 'Somewhere', place: undefined })
  })

  test('only the latest text\'s suggestions show, even from a provider that ignores the abort signal', async () => {
    let resolveOld: (places: Place[]) => void = () => {}
    const search = vi.fn<PlaceSearch>()
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve }))
      .mockResolvedValueOnce([{ ...flore, name: 'Flore Café', address: 'Lyon' }])
    open(search)
    fireEvent.change(location(), { target: { value: 'Flor' } })
    await vi.waitFor(() => expect(search).toHaveBeenCalledTimes(1))
    fireEvent.change(location(), { target: { value: 'Flore Lyon' } })
    expect(await screen.findByRole('option', { name: /Flore Café/ })).toBeTruthy()
    act(() => resolveOld([flore]))
    await new Promise((r) => setTimeout(r, 0))
    expect(screen.queryByRole('option', { name: /Café de Flore/ })).toBeNull()
  })

  test('while new text is being searched, the previous suggestions are gone (Enter cannot pick a stale one)', async () => {
    open(vi.fn<PlaceSearch>().mockResolvedValue([flore]))
    fireEvent.change(location(), { target: { value: 'Flore' } })
    await screen.findByRole('option', { name: /Café de Flore/ })
    fireEvent.change(location(), { target: { value: 'Flore Paris' } })
    expect(screen.queryByRole('option', { name: /Café de Flore/ })).toBeNull()
    expect(screen.getByRole('status').textContent).toBe('Searching…')
  })

  test('a video link is kept as typed and never sent to the provider', async () => {
    const search = vi.fn<PlaceSearch>().mockResolvedValue([flore])
    open(search)
    fireEvent.change(location(), { target: { value: 'https://meet.example.com/abc' } })
    await new Promise((r) => setTimeout(r, 400))
    expect(search).not.toHaveBeenCalled()
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  test('without placeSearch (the default) the field is plain text and nothing is searched', () => {
    open()
    expect(location().getAttribute('role')).toBeNull()
  })

  test('the event card shows a saved place with Open in Maps and Directions', () => {
    const today = startOfDay(new Date())
    const coffee: CalendarEvent = { id: 'c', title: 'Coffee', start: todayAt(9), end: todayAt(10), location: 'Café de Flore, 172 Boulevard Saint-Germain, Paris', place: flore }
    render(<Scheduler view="day" date={today} events={[coffee]} />)
    act(() => screen.getByText('Coffee').click())
    expect(screen.getByText('Café de Flore')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Directions/ }).getAttribute('href')).toBe('https://www.google.com/maps/dir/?api=1&destination=48.854%2C2.3326')
  })
})
