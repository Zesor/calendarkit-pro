import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { DndContext } from '@dnd-kit/core'
import { WeekView } from './WeekView'
import { DayView } from './DayView'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const scrollTopOf = (container: HTMLElement) =>
  (container.querySelector('.ck\\:overflow-y-auto') as HTMLElement).scrollTop

test('week view scrolls to 4 hours before now on mount (60px/hour)', () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 15, 10, 0))
  const { container } = render(
    <DndContext><WeekView currentDate={new Date(2026, 9, 15)} events={[]} /></DndContext>,
  )
  expect(scrollTopOf(container)).toBe((10 - 4) * 60)
})

test('day view scrolls to 3 hours before now on mount (80px/hour)', () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 15, 10, 0))
  const { container } = render(
    <DndContext><DayView currentDate={new Date(2026, 9, 15)} events={[]} /></DndContext>,
  )
  expect(scrollTopOf(container)).toBe((10 - 3) * 80)
})
