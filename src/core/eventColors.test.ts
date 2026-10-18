import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { contrast, DARK_SURFACES, DARK_TINT, eventColors, LIGHT_SURFACES, LIGHT_TINT, tintOf } from './eventColors'

// Every hue at three lightnesses, plus the colours most likely to fail (yellow, cyan, white, black).
const hsl = (h: number, l: number) => {
  const a = Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
  }
  return '#' + [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, '0')).join('')
}
const SAMPLES = [
  ...Array.from({ length: 36 }, (_, i) => [0.3, 0.5, 0.75].map((l) => hsl(i * 10, l))).flat(),
  '#ffff00', '#00ffff', '#ffffff', '#000000', '#3b82f6', '#10b981', 'rgb(255, 200, 0)', '#fc0',
]

describe('event colours', () => {
  test('white on the solid, the light ink on light tints and the dark ink on dark tints reach 4.5:1 for 116 colours', () => {
    const failing: string[] = []
    for (const color of SAMPLES) {
      const c = eventColors(color)!
      if (contrast('#ffffff', c.solid) < 4.5) failing.push(`${color}: white on ${c.solid}`)
      for (const s of LIGHT_SURFACES) {
        const tint = tintOf(c.solid, s, LIGHT_TINT)
        if (contrast(c.inkLight, tint) < 4.5) failing.push(`${color}: ${c.inkLight} on ${tint}`)
      }
      for (const s of DARK_SURFACES) {
        const tint = tintOf(c.solid, s, DARK_TINT)
        if (contrast(c.inkDark, tint) < 4.5) failing.push(`${color}: ${c.inkDark} on ${tint}`)
      }
    }
    expect(SAMPLES).toHaveLength(116)
    expect(failing).toEqual([])
  })

  test('keeps a colour that already passes, and reads #rgb, #rrggbbaa and rgb()', () => {
    expect(eventColors('#2f43c2')!.solid).toBe('#2f43c2')
    expect(eventColors('#fff')).toEqual(eventColors('#ffffff'))
    expect(eventColors('#2f43c2cc')).toEqual(eventColors('#2f43c2'))
    expect(eventColors('rgb(47 67 194)')).toEqual(eventColors('#2f43c2'))
  })

  test('other syntaxes (names, hsl, variables) are left to the theme', () => {
    expect(eventColors('teal')).toBeNull()
    expect(eventColors('hsl(200 50% 50%)')).toBeNull()
    expect(eventColors('var(--brand)')).toBeNull()
  })

  test('the surfaces are the backgrounds of the themes', () => {
    const css = readFileSync('src/styles/themes.css', 'utf8')
    const backgrounds = [...css.matchAll(/--ck-background: (#[0-9a-f]{6})/g)].map((m) => m[1])
    expect([...new Set(backgrounds)].sort()).toEqual([...LIGHT_SURFACES, ...DARK_SURFACES].sort())
  })
})
