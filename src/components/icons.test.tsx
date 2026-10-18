import { render } from '@testing-library/react'
import React from 'react'
import { describe, expect, test } from 'vitest'
import { ChevronLeft, Trash2 } from './icons'

describe('icons', () => {
  test('are decorative stroke SVGs that take the caller props', () => {
    const { container } = render(<><ChevronLeft className="size" /><Trash2 strokeWidth={3} /></>)
    const [chevron, trash] = container.querySelectorAll('svg')
    expect(chevron.getAttribute('aria-hidden')).toBe('true')
    expect(chevron.getAttribute('focusable')).toBe('false')
    expect(chevron.getAttribute('stroke')).toBe('currentColor')
    expect(chevron.getAttribute('class')).toBe('size')
    expect(chevron.querySelector('path')!.getAttribute('d')).toBe('m15 18-6-6 6-6')
    expect(trash.getAttribute('stroke-width')).toBe('3')
    expect(trash.children.length).toBeGreaterThan(1)
  })
})
