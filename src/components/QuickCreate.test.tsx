// Spec §8.5: a click on a free slot opens the quick card; the title is a sentence the engine
// understands, Enter saves, and a typed draft is never dropped without asking.
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { addDays, startOfDay } from 'date-fns'
import React from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { Scheduler } from '../index'
import type { CalendarEvent, CalendarProps } from '../types'

afterEach(cleanup)

const today = startOfDay(new Date())
const standup: CalendarEvent = { id: 'su', title: 'Standup', start: new Date(today.getTime() + 9.5 * 3600e3), end: new Date(today.getTime() + 10 * 3600e3) }

// The day view's quarter-hour slots, in order (index 36 = 09:00).
const slots = (container: HTMLElement) => container.querySelectorAll<HTMLElement>('.ck\\:z-0.ck\\:cursor-pointer')
function openAt9(props: Partial<CalendarProps> = {}) {
  const view = render(<Scheduler view="day" date={today} events={[standup]} {...props} />)
  act(() => slots(view.container)[36].click())
  return view
}
// The quick card (the full editor is a dialog named "New Event" too): the one in the grid's layer.
const card = () => document.querySelector<HTMLElement>('[data-ck-layer] [role="dialog"]')
const title = () => screen.getByRole('textbox', { name: 'Add title' })

describe('quick create', () => {
  test('a slot click opens the card with the title focused and draws the new event dashed in its column', () => {
    const { container } = openAt9()
    expect(card()).toBeTruthy()
    expect(document.activeElement).toBe(title())
    expect(card()!.textContent).toContain('9:00 AM – 10:00 AM')
    const ghost = container.querySelector<HTMLElement>('.ck\\:outline-dashed')!
    expect(ghost.textContent).toBe('New Event')
    expect(ghost.style.top).toBe(`${9 * 80}px`)
  })

  test('the title is understood as a sentence and Enter saves the cleaned title at the understood time', () => {
    const onEventCreate = vi.fn()
    openAt9({ onEventCreate })
    fireEvent.change(title(), { target: { value: 'Lunch with Lea tomorrow 1pm' } })
    // Each understood word is marked; the title is saved without them.
    expect([...card()!.querySelectorAll('mark')].map((m) => m.textContent)).toEqual(['tomorrow', '1pm'])
    expect(card()!.textContent).toContain('saved as “Lunch with Lea”')
    expect(card()!.textContent).toContain('1:00 PM – 2:00 PM')
    fireEvent.keyDown(title(), { key: 'Enter' })
    expect(onEventCreate).toHaveBeenCalledWith(expect.objectContaining({ title: 'Lunch with Lea', start: new Date(addDays(today, 1).getTime() + 13 * 3600e3) }))
    expect(card()).toBeNull()
  })

  test('the calendar menu sets the calendar, an overlap is announced', () => {
    const onEventCreate = vi.fn()
    openAt9({ onEventCreate, calendars: [{ id: 'w', label: 'Work' }] })
    expect(screen.getByText('Overlaps “Standup”').getAttribute('role')).toBe('status')
    fireEvent.change(screen.getByRole('combobox', { name: 'Calendar' }), { target: { value: 'w' } })
    act(() => screen.getByRole('button', { name: 'Save' }).click())
    expect(onEventCreate).toHaveBeenCalledWith(expect.objectContaining({ calendarId: 'w', end: new Date(today.getTime() + 10 * 3600e3) }))
  })

  test('a short card: the title (an example sentence as placeholder), when and calendar on one line, More options and Save', () => {
    openAt9({ calendars: [{ id: 'w', label: 'Work' }] })
    expect(title().getAttribute('placeholder')).toBe('Try “Lunch with Lea tomorrow 1pm”')
    expect(within(card()!).queryByRole('group', { name: 'Duration' })).toBeNull()
    expect(within(card()!).queryByRole('button', { name: 'Cancel' })).toBeNull()
    expect(within(card()!).getAllByRole('button').map((b) => b.textContent)).toEqual(['More options', 'Save'])
    expect(screen.getByRole('combobox', { name: 'Calendar' }).closest('p, div')!.textContent).toContain('9:00 AM – 10:00 AM')
  })

  test('Escape closes an untouched card, and asks before dropping a typed title', () => {
    openAt9()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(card()).toBeNull()
    cleanup()
    openAt9()
    fireEvent.change(title(), { target: { value: 'Call Bob' } })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByRole('alertdialog', { name: 'Discard changes?' })).toBeTruthy()
    act(() => screen.getByRole('button', { name: 'Keep editing' }).click())
    expect((title() as HTMLInputElement).value).toBe('Call Bob')
    fireEvent.click(card()!.parentElement!) // outside the card
    act(() => screen.getByRole('button', { name: 'Discard' }).click())
    expect(card()).toBeNull()
  })

  test('"More options" opens the full editor with the cleaned title, the understood time and the calendar', () => {
    openAt9({ calendars: [{ id: 'w', label: 'Work' }, { id: 'p', label: 'Personal' }] })
    fireEvent.change(title(), { target: { value: 'Lunch with Lea tomorrow 1pm' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Calendar' }), { target: { value: 'p' } })
    act(() => screen.getByRole('button', { name: 'More options' }).click())
    expect(card()).toBeNull()
    expect((screen.getByPlaceholderText('Add title') as HTMLInputElement).value).toBe('Lunch with Lea')
    expect((screen.getByLabelText('Start') as HTMLInputElement).value).toMatch(/T13:00$/)
    expect((within(screen.getByPlaceholderText('Add title').closest('form')!).getByRole('combobox', { name: 'Calendar' }) as HTMLSelectElement).value).toBe('p')
  })

  test('what the card carried into the editor is not dropped silently: Cancel asks first', () => {
    openAt9()
    fireEvent.change(title(), { target: { value: 'Lunch with Lea' } })
    act(() => screen.getByRole('button', { name: 'More options' }).click())
    act(() => within(screen.getByPlaceholderText('Add title').closest('form')!).getByRole('button', { name: 'Cancel' }).click())
    expect(screen.getByRole('alertdialog')).toBeTruthy()
  })

  test('Enter while an input method is composing does not save', () => {
    const onEventCreate = vi.fn()
    openAt9({ onEventCreate })
    fireEvent.change(title(), { target: { value: 'とうきょう' } })
    fireEvent.keyDown(title(), { key: 'Enter', isComposing: true })
    expect(onEventCreate).not.toHaveBeenCalled()
    expect(card()).toBeTruthy()
  })

  test('with renderEventForm (1.x), a slot click still opens the custom form', () => {
    const renderEventForm = vi.fn(() => null)
    openAt9({ renderEventForm })
    expect(card()).toBeNull()
    expect(renderEventForm).toHaveBeenLastCalledWith(expect.objectContaining({ isOpen: true, event: null }))
  })

  test('the card opens beside the new event drawn in the grid, inside the calendar', () => {
    // jsdom measures nothing: the ghost and the card's layer get their boxes here.
    const boxes = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const box = this.matches('[data-ck-ghost]') ? { left: 300, top: 260, right: 400, bottom: 320 }
        : this.matches('[data-ck-layer]') ? { left: 50, top: 100, right: 1050, bottom: 800 }
        : { left: 0, top: 0, right: 0, bottom: 0 }
      return { ...box, x: box.left, y: box.top, width: box.right - box.left, height: box.bottom - box.top, toJSON: () => ({}) } as DOMRect
    })
    openAt9()
    expect(card()!.style.left).toBe('362px')
    expect(card()!.style.top).toBe('160px')
    boxes.mockRestore()
  })

  test('French sentences in French', () => {
    openAt9({ language: 'fr' })
    fireEvent.change(screen.getByRole('textbox', { name: 'Ajouter un titre' }), { target: { value: 'Déj avec Léa demain 13h' } })
    expect([...screen.getByRole('dialog').querySelectorAll('mark')].map((m) => m.textContent)).toEqual(['demain', '13h'])
    expect(screen.getByRole('dialog').textContent).toContain('Compris :')
    expect(screen.getByRole('dialog').textContent).toContain('enregistré sous « Déj avec Léa »')
  })
})
