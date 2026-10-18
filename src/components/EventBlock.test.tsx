// Spec §8.3: a block shows as much as its size allows, never a line cut in half.
import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, test } from 'vitest'
import type { CalendarEvent } from '../types'
import { blockLayout, EventBlock } from './EventBlock'

afterEach(cleanup)

const review: CalendarEvent = { id: 'rv', title: 'Design review', start: new Date(2026, 9, 14, 9), end: new Date(2026, 9, 14, 11), color: '#2f43c2' }

describe('event blocks', () => {
  test('size classes: < 22 px title only, < 44 px one line with the time from 130 px, then lines; < 92 px wide: no time', () => {
    expect(blockLayout(15, 200)).toMatchObject({ size: 'xs', showTime: false })
    expect(blockLayout(30, 200)).toMatchObject({ size: 'sm', showTime: true })
    expect(blockLayout(30, 120)).toMatchObject({ size: 'sm', showTime: false })
    expect(blockLayout(120, 200)).toMatchObject({ size: 'lg', narrow: false, showTime: true, titleLines: 3 })
    expect(blockLayout(60, 200)).toMatchObject({ size: 'lg', titleLines: 2 })
    expect(blockLayout(120, 80)).toMatchObject({ size: 'lg', narrow: true, showTime: false, titleLines: 4 })
    // Not measured yet: treated as wide.
    expect(blockLayout(30)).toMatchObject({ size: 'sm', showTime: true, narrow: false })
  })

  test('a 30-minute block reads "Title · 9:00" on one line; a 2-hour block shows the range under the title', () => {
    const { container, rerender } = render(<EventBlock event={review} height={30} width={200} />)
    expect(container.textContent).toBe('Design review9:00 AM')
    rerender(<EventBlock event={review} height={120} width={200} />)
    expect(container.textContent).toBe('Design review9:00 AM – 11:00 AM')
    expect(screen.getByText('Design review').className).toContain('ck:line-clamp-3')
  })

  test('a narrow or 15-minute block keeps only the title; the full text stays in the tooltip', () => {
    const { container, rerender } = render(<EventBlock event={review} height={15} width={200} />)
    expect(container.textContent).toBe('Design review')
    rerender(<EventBlock event={review} height={120} width={80} />)
    expect(container.textContent).toBe('Design review')
    expect(screen.getByText('Design review').className).toContain('ck:line-clamp-4')
    expect(screen.getByTitle('Design review, 9:00 AM – 11:00 AM')).toBeTruthy()
  })

  test('the block is filled with its colour', () => {
    const { container } = render(<EventBlock event={review} height={60} />)
    const block = container.firstElementChild as HTMLElement
    expect(block.className).toContain('ck-event')
    expect(block.style.getPropertyValue('--ck-ev')).toBe('#2f43c2')
  })
})
