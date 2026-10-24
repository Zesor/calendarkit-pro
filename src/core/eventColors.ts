// Calendar colours (spec §8.2): any colour a host gives an event, a calendar or a resource becomes a
// solid fill, a light-mode ink and a dark-mode ink, every pair readable (WCAG AA, 4.5:1) on the
// surfaces the themes draw events on. The stylesheet mixes the tints the same way (color-mix in srgb).

type Rgb = [number, number, number]

export interface EventColors {
  /** Fill of the vivid theme (white text) and the month dots. */
  solid: string
  /** Text on the light tint (calm, all-day bars of editorial). */
  inkLight: string
  /** Text on the dark tint. */
  inkDark: string
}

/** Event surfaces of the themes (src/styles/themes.css), and the share of the colour in their tint. */
export const LIGHT_SURFACES = ['#ffffff', '#fcfaf6']
export const DARK_SURFACES = ['#141417', '#10162a', '#1b1713']
export const LIGHT_TINT = 0.14
export const DARK_TINT = 0.26

const WHITE: Rgb = [255, 255, 255]
const BLACK: Rgb = [0, 0, 0]
// The solid keeps the host's colour as long as white text passes (with a margin for rounding); inks
// aim higher than the 4.5:1 floor, for text read at 12 px.
const SOLID_TARGET = 4.6
const INK_TARGET = 6

function parse(color: string): Rgb | null {
  const value = color.trim().toLowerCase()
  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(value)
  if (hex) {
    const h = hex[1].length <= 4 ? [...hex[1].slice(0, 3)].map((c) => c + c).join('') : hex[1].slice(0, 6)
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb
  }
  const rgb = /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})\s*(?:[,/]\s*[\d.]+%?\s*)?\)$/.exec(value)
  if (rgb) {
    const channels = rgb.slice(1, 4).map(Number)
    return channels.every((c) => c <= 255) ? (channels as Rgb) : null
  }
  return null
}

const hexOf = (c: Rgb) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
const rounded = (c: Rgb) => c.map(Math.round) as Rgb
const mix = (a: Rgb, b: Rgb, share: number) => a.map((v, i) => v * share + b[i] * (1 - share)) as Rgb
const toward = (c: Rgb, target: Rgb, t: number) => c.map((v, i) => v + (target[i] - v) * t) as Rgb

function luminance(c: Rgb): number {
  const [r, g, b] = c.map((v) => {
    const s = Math.round(v) / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio of two colours. */
export function contrast(a: string | Rgb, b: string | Rgb): number {
  const [la, lb] = [typeof a === 'string' ? parse(a)! : a, typeof b === 'string' ? parse(b)! : b].map(luminance)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** The first colour on the way from `from` to `target` (2 % steps) that passes `ok`. */
function adjust(from: Rgb, target: Rgb, ok: (c: Rgb) => boolean): Rgb {
  for (let t = 0; t <= 1.0001; t += 0.02) {
    const candidate = rounded(toward(from, target, t))
    if (ok(candidate)) return candidate
  }
  return target
}

const cache = new Map<string, EventColors | null>()

/** The readable solid and inks of a hex or rgb() colour; `null` for any other syntax. */
export function eventColors(color: string): EventColors | null {
  const cached = cache.get(color)
  if (cached !== undefined) return cached
  const base = parse(color)
  let result: EventColors | null = null
  if (base) {
    const solid = adjust(base, BLACK, (c) => contrast(c, WHITE) >= SOLID_TARGET)
    const inkLight = adjust(solid, BLACK, (c) => LIGHT_SURFACES.every((s) => contrast(c, rounded(mix(solid, parse(s)!, LIGHT_TINT))) >= INK_TARGET))
    const inkDark = adjust(solid, WHITE, (c) => DARK_SURFACES.every((s) => contrast(c, rounded(mix(solid, parse(s)!, DARK_TINT))) >= INK_TARGET))
    result = { solid: hexOf(solid), inkLight: hexOf(inkLight), inkDark: hexOf(inkDark) }
  }
  cache.set(color, result)
  return result
}

/** The tint the stylesheet draws under an event: `color-mix(in srgb, solid <share>, surface)`. */
export function tintOf(solid: string, surface: string, share: number): string {
  return hexOf(mix(parse(solid)!, parse(surface)!, share))
}
