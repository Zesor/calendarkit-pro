// Spec §8.6: every change is announced with Undo for 6 seconds (no confirmation dialog before a
// delete: Undo replaces it), and the event just created or moved is outlined briefly.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { startOfDay } from 'date-fns'
import React from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { Scheduler } from '../index'
import type { CalendarEvent } from '../types'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const today = startOfDay(new Date())
const standup: CalendarEvent = { id: 'su', title: 'Standup', start: new Date(today.getTime() + 9 * 3600e3), end: new Date(today.getTime() + 9.5 * 3600e3) }
const toast = () => screen.queryByText(/created|deleted|resized/)

describe('undo toast', () => {
  test('a quick create is announced; Undo reverts it through the 1.x callbacks', () => {
    const onEventCreate = vi.fn()
    const onEventDelete = vi.fn()
    const { container } = render(<Scheduler view="day" date={today} events={[standup]} onEventCreate={onEventCreate} onEventDelete={onEventDelete} />)
    act(() => container.querySelectorAll<HTMLElement>('.ck\\:z-0.ck\\:cursor-pointer')[44].click())
    fireEvent.change(screen.getByRole('textbox', { name: 'Add title' }), { target: { value: 'Call Bob' } })
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Add title' }), { key: 'Enter' })
    expect(toast()!.textContent).toBe('“Call Bob” created')
    act(() => screen.getByRole('button', { name: 'Undo' }).click())
    expect(onEventDelete).toHaveBeenCalledTimes(1)
    expect(toast()).toBeNull()
  })

  test('a delete needs no confirmation: the toast offers Undo, which gives the event back', () => {
    const onEventDelete = vi.fn()
    const onEventCreate = vi.fn()
    render(<Scheduler view="day" date={today} events={[standup]} onEventDelete={onEventDelete} onEventCreate={onEventCreate} />)
    fireEvent.contextMenu(screen.getByText('Standup'))
    act(() => screen.getByRole('button', { name: /Delete/ }).click())
    expect(onEventDelete).toHaveBeenCalledWith('su')
    expect(toast()!.textContent).toBe('“Standup” deleted')
    act(() => screen.getByRole('button', { name: 'Undo' }).click())
    expect(onEventCreate).toHaveBeenCalledWith(expect.objectContaining({ id: 'su', title: 'Standup' }))
  })

  test('the toast leaves after 6 seconds', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    render(<Scheduler view="day" date={today} events={[standup]} />)
    fireEvent.contextMenu(screen.getByText('Standup'))
    act(() => screen.getByRole('button', { name: /Delete/ }).click())
    expect(toast()).toBeTruthy()
    act(() => void vi.advanceTimersByTime(5900))
    expect(toast()).toBeTruthy()
    act(() => void vi.advanceTimersByTime(200))
    expect(toast()).toBeNull()
  })

  test('the event just resized is outlined for 1.6 seconds', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const { container } = render(<Scheduler view="day" date={today} events={[standup]} />)
    const handle = container.querySelector('.ck\\:cursor-ns-resize') as HTMLElement
    fireEvent.mouseDown(handle, { clientY: 100 })
    fireEvent.mouseMove(document, { clientY: 140 })
    fireEvent.mouseUp(document)
    expect(toast()!.textContent).toBe('“Standup” resized')
    expect(screen.getByText('Standup').closest('.ck-event')!.className).toContain('ck:animate-landed')
    act(() => void vi.advanceTimersByTime(1700))
    expect(screen.getByText('Standup').closest('.ck-event')!.className).not.toContain('ck:animate-landed')
  })
})
