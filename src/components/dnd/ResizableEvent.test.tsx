import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import type { CalendarEvent } from '../../types'
import { ResizableEvent } from './ResizableEvent'

afterEach(cleanup)

const event: CalendarEvent = { id: 'e', title: 'e', start: new Date(2026, 9, 15, 9), end: new Date(2026, 9, 15, 10) }
const handleOf = (container: HTMLElement) => container.querySelector('.ck\\:cursor-ns-resize') as HTMLElement

test('dragging the handle down by half an hour extends the event by 30 minutes', () => {
  const onResize = vi.fn()
  const { container } = render(<ResizableEvent event={event} hourHeight={60} onResize={onResize}><span>e</span></ResizableEvent>)
  fireEvent.mouseDown(handleOf(container), { clientY: 100 })
  fireEvent.mouseMove(document, { clientY: 130 })
  fireEvent.mouseUp(document)
  expect(onResize).toHaveBeenCalledWith(event, new Date(2026, 9, 15, 10, 30))
})

test('a read-only or locked event has no resize handle', () => {
  const { container, rerender } = render(<ResizableEvent event={event} hourHeight={60} readonly><span>e</span></ResizableEvent>)
  expect(handleOf(container)).toBeNull()
  rerender(<ResizableEvent event={{ ...event, resizable: false }} hourHeight={60}><span>e</span></ResizableEvent>)
  expect(handleOf(container)).toBeNull()
})
