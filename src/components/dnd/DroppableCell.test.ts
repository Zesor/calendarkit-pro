// While a drag hovers a cell, its drop highlight must win over the cell's own background and ring:
// classes are joined, never merged, so the two sets may not both be present.
import { twMerge } from 'tailwind-merge'
import { describe, expect, test } from 'vitest'
import { droppableCellClasses } from './DroppableCell'

const today = { className: 'ck:h-full ck:p-2', idleClassName: 'ck:bg-primary/5 ck:ring-1 ck:ring-inset ck:ring-primary/20', date: new Date(2026, 9, 14) }

describe('droppable cell classes', () => {
  test('a drag over the cell replaces its own background and ring with the drop highlight', () => {
    const over = droppableCellClasses({ ...today, isOver: true })
    expect(twMerge(over)).toBe(over)
    expect(over).toContain('ck:ring-2 ck:ring-primary')
    expect(over).not.toContain('ck:bg-primary/5')
  })

  test('without a drag the cell keeps its own background and ring', () => {
    const idle = droppableCellClasses({ ...today, isOver: false, clickable: true })
    expect(twMerge(idle)).toBe(idle)
    expect(idle).toContain('ck:bg-primary/5 ck:ring-1')
    expect(idle).toContain('ck:cursor-pointer')
  })
})
