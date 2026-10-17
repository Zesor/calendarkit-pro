import { describe, expect, test } from 'vitest'
import { safeColor } from './color'

describe('safeColor', () => {
  test.each([
    '#3b82f6', '#fff', '#3b82f680', 'rgb(59, 130, 246)', 'rgba(0,0,0,0.5)', 'hsl(217 91% 60%)', 'rebeccapurple',
    'oklch(70% 0.1 250)', 'hsl(217deg 91% 60%)', 'var(--brand)', 'hsl(var(--primary))', 'color-mix(in srgb, red 50%, blue)',
  ])(
    'accepts %s',
    (color) => expect(safeColor(color, 'fallback')).toBe(color),
  )

  test.each(['red; } body { display: none', 'url(javascript:alert(1))', '"red"', 'expression(alert(1))', '', undefined])(
    'rejects %s',
    (color) => expect(safeColor(color as string | undefined, 'fallback')).toBe('fallback'),
  )
})
