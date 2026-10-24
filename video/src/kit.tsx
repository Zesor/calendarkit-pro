// The video's design system: Calm colours, type, motion, the camera on a capture, the cursor, the HUD.
import { useId, type CSSProperties, type ReactNode } from 'react'
import { Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion'
import { loadFont as loadSans } from '@remotion/google-fonts/InstrumentSans'
import { loadFont as loadSerif } from '@remotion/google-fonts/Newsreader'
import { loadFont as loadMono } from '@remotion/google-fonts/JetBrainsMono'
import manifest from '../public/captures/manifest.json'

export const m = manifest
export const FPS = 30
export const BEAT = 15 // 120 BPM: every cut lands on a half second

// Calm (the default theme), light and dark.
export const C = {
  paper: '#ffffff', ink: '#17171a', mist: '#f2f2f4', line: '#e2e2e6', sub: '#52525b', blue: '#3b5bdb',
  night: '#0c0c0e', panel: '#1c1c20', nightLine: '#2a2a30', nightSub: '#b4b4bd', ring: '#8ea2ff',
}
// Calm's own face for display, Editorial's serif for the asides, a mono for code and the HUD.
export const SANS = loadSans('normal', { weights: ['500', '700'], subsets: ['latin'] }).fontFamily
export const SERIF = loadSerif('italic', { weights: ['400'], subsets: ['latin'] }).fontFamily
export const MONO = loadMono('normal', { weights: ['400', '500'], subsets: ['latin'] }).fontFamily

export const display = (size: number, color: string = C.ink): CSSProperties => ({ fontFamily: SANS, fontWeight: 700, fontSize: size, lineHeight: 0.92, letterSpacing: '-0.045em', color, whiteSpace: 'nowrap' })
export const serif = (size: number, color: string = C.ink): CSSProperties => ({ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 400, fontSize: size, lineHeight: 1.1, letterSpacing: '-0.01em', color, whiteSpace: 'nowrap' })
export const mono = (size: number, color: string = C.sub): CSSProperties => ({ fontFamily: MONO, fontWeight: 500, fontSize: size, letterSpacing: '0.04em', color, whiteSpace: 'pre' })

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1)
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1)
export const tween = (f: number, from: number, to: number, a: number, b: number, easing = easeOut) => interpolate(f, [from, to], [a, b], { ...clamp, easing })
export const typed = (text: string, f: number, at: number, perFrame = 1.5) => text.slice(0, Math.max(0, Math.floor((f - at) * perFrame)))

type Values = Record<string, number>
/** Values between keyframes `{ f, ...values }`, eased in and out. */
export function track<T extends Values>(f: number, keys: Array<T & { f: number }>): T {
  const i = keys.findIndex((k) => k.f > f)
  if (i === 0) return keys[0]
  if (i === -1) return keys[keys.length - 1]
  const [a, b] = [keys[i - 1], keys[i]]
  const t = easeInOut((f - a.f) / (b.f - a.f))
  const out: Values = {}
  for (const k of Object.keys(a)) out[k] = a[k] + (b[k] - a[k]) * t
  return out as T
}

/** Motion blur along the movement: a one-axis Gaussian blur as wide as the speed. */
export function Blur({ id, x = 0, y = 0 }: { id: string; x?: number; y?: number }) {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
      <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation={`${Math.min(Math.abs(x) * 0.45, 48)} ${Math.min(Math.abs(y) * 0.45, 48)}`} />
      </filter>
    </svg>
  )
}

/** A line that slams in from the side (or from below) and lands sharp. */
export function Slam({ at, children, from = 1, axis = 'x', dist = 360, dur = 9, style }: { at: number; children: ReactNode; from?: 1 | -1; axis?: 'x' | 'y'; dist?: number; dur?: number; style?: CSSProperties }) {
  const f = useCurrentFrame()
  const id = `b${useId().replace(/[^a-z0-9]/gi, '')}`
  if (f < at) return null
  const pos = (t: number) => tween(t, at, at + dur, dist * from, 0, Easing.out(Easing.exp))
  const v = pos(f) - pos(f - 1)
  const moving = Math.abs(v) > 0.5
  return (
    <div style={{ ...style, transform: axis === 'x' ? `translateX(${pos(f)}px)` : `translateY(${pos(f)}px)`, filter: moving ? `url(#${id})` : undefined }}>
      {moving && <Blur id={id} x={axis === 'x' ? v : 0} y={axis === 'y' ? v : 0} />}
      {children}
    </div>
  )
}

/** Fades and rises in: the serif asides. */
export function Rise({ at, children, style }: { at: number; children: ReactNode; style?: CSSProperties }) {
  const f = useCurrentFrame()
  return <div style={{ ...style, opacity: tween(f, at, at + 8, 0, 1), transform: `translateY(${tween(f, at, at + 10, 24, 0)}px)` }}>{children}</div>
}

/** The left column of a feature: a slammed title, a serif aside, a mono detail. */
export function Feature({ lines, aside, detail, dark = false, at = 0, size = 92 }: { lines: string[]; aside?: string; detail?: string; dark?: boolean; at?: number; size?: number }) {
  const f = useCurrentFrame()
  const ink = dark ? C.paper : C.ink
  return (
    <div style={{ position: 'absolute', left: 130, top: 0, bottom: 0, width: 540, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 26 }}>
      <div>{lines.map((l, i) => <Slam key={l} at={at + i * 3} style={display(size, ink)}>{l}</Slam>)}</div>
      {aside && <Rise at={at + 8} style={{ ...serif(40, ink), whiteSpace: 'normal' }}>{aside}</Rise>}
      {detail && <div style={mono(20, dark ? C.nightSub : C.sub)}>{typed(detail, f, at + 12, 2.5)}</div>}
    </div>
  )
}

export type Box = { x: number; y: number; w: number; h: number }
export type Cam = { cx: number; cy: number; z: number }
// A capture is the 1440 x 900 viewport; a box shows it at `z` times its fitted size, centred on (cx, cy).
export const VIEW = { w: m.viewport.w, h: m.viewport.h }
export const WIN: Box = { x: 700, y: 196, w: 1100, h: 688 }

/** The camera's projection: capture CSS px to box px. The centre is clamped so the capture always covers the box. */
export function lens(cam: Cam, box: Box, view = VIEW) {
  const s = (box.w / view.w) * cam.z
  const half = { w: box.w / 2 / s, h: box.h / 2 / s }
  const cx = Math.min(Math.max(cam.cx, half.w), view.w - half.w)
  const cy = Math.min(Math.max(cam.cy, half.h), view.h - half.h)
  return { s, cx, cy, map: (p: { x: number; y: number }) => ({ x: box.w / 2 + (p.x - cx) * s, y: box.h / 2 + (p.y - cy) * s }) }
}

/** The zoom and centre that fit `rects` in the box, with a margin in CSS px. */
export function fit(rects: Array<{ x: number; y: number; w: number; h: number }>, box: Box = WIN, margin = 60): Cam {
  const x0 = Math.min(...rects.map((r) => r.x)) - margin, x1 = Math.max(...rects.map((r) => r.x + r.w)) + margin
  const y0 = Math.min(...rects.map((r) => r.y)) - margin, y1 = Math.max(...rects.map((r) => r.y + r.h)) + margin
  // At zoom z the box shows VIEW.w / z CSS px across and (box.h / box.w) * VIEW.w / z down.
  const z = Math.min(VIEW.w / (x1 - x0), ((box.h / box.w) * VIEW.w) / (y1 - y0))
  // Past 2.6 the window shows the 2x captures above their own resolution.
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, z: Math.min(Math.max(1, z), 2.6) }
}

/** A real capture in a window, filmed by the camera. Children are drawn above it, in box px. */
export function Shot({ src, cam, box = WIN, dark = false, radius = 22, children, style }: { src: string; cam: Cam; box?: Box; dark?: boolean; radius?: number; children?: ReactNode; style?: CSSProperties }) {
  const { s, cx, cy } = lens(cam, box)
  return (
    <div style={{ position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, overflow: 'hidden', borderRadius: radius, border: `1px solid ${dark ? C.nightLine : C.line}`, background: dark ? '#141417' : C.paper, boxShadow: dark ? 'none' : '0 40px 90px -40px rgb(23 23 26 / 0.35)', ...style }}>
      <Img src={staticFile(`captures/${src}.png`)} style={{ position: 'absolute', left: 0, top: 0, width: VIEW.w, height: VIEW.h, maxWidth: 'none', transformOrigin: '0 0', transform: `translate(${box.w / 2 - cx * s}px, ${box.h / 2 - cy * s}px) scale(${s})` }} />
      {children}
    </div>
  )
}

/** The pointer, drawn at a box position; `press` (0 to 1) shrinks it for a click. */
export function Cursor({ x, y, press = 0, opacity = 1 }: { x: number; y: number; press?: number; opacity?: number }) {
  return (
    <svg viewBox="0 0 32 40" width={32} height={40} style={{ position: 'absolute', left: x - 5, top: y - 3, opacity, transform: `scale(${1 - press * 0.18})`, transformOrigin: '5px 3px', overflow: 'visible' }} aria-hidden>
      <path d="M5 3 L5 31 L12 24.5 L16.6 35.5 L21.6 33.4 L17 22.6 L26.6 22.6 Z" fill={C.paper} stroke={C.ink} strokeWidth={2.4} strokeLinejoin="round" />
    </svg>
  )
}

/** The ring a click leaves, for 10 frames from `at`. */
export function Ripple({ x, y, at, color = C.blue }: { x: number; y: number; at: number; color?: string }) {
  const f = useCurrentFrame()
  if (f < at || f > at + 10) return null
  const r = tween(f, at, at + 10, 6, 44)
  return <div style={{ position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: '50%', border: `3px solid ${color}`, opacity: tween(f, at, at + 10, 1, 0) }} />
}

/** How hard the pointer is pressed for a click at `at`: down for 3 frames, then back. */
export const press = (f: number, at: number) => (f < at - 1 || f > at + 3 ? 0 : f <= at + 1 ? 1 : 0.5)

/** The "today" badge of the calendar, used as a mark. */
export function Badge({ children, at }: { children: ReactNode; at: number }) {
  const f = useCurrentFrame()
  const k = interpolate(f, [at, at + 5, at + 9], [0, 1.12, 1], clamp)
  return (
    <span style={{ display: 'inline-block', transform: `scale(${k})`, background: C.ink, color: C.paper, borderRadius: '0.16em', padding: '0.04em 0.14em 0.06em', lineHeight: 1 }}>{children}</span>
  )
}

/** Viewfinder corners, the brand, the scene counter, its name and the timecode. */
export function Hud({ frame, scene, total, label, dark }: { frame: number; scene: number; total: number; label: string; dark: boolean }) {
  const ink = dark ? C.nightSub : C.sub
  const corner = (style: CSSProperties) => <div style={{ position: 'absolute', width: 26, height: 26, borderColor: dark ? '#5a5a63' : '#b4b4bd', borderStyle: 'solid', borderWidth: 0, ...style }} />
  const s = Math.floor(frame / FPS), ff = frame % FPS
  const tc = `00:00:${String(s).padStart(2, '0')}:${String(ff).padStart(2, '0')}`
  const text: CSSProperties = { ...mono(15, ink), position: 'absolute', letterSpacing: '0.14em' }
  return (
    <>
      {corner({ left: 44, top: 44, borderLeftWidth: 2, borderTopWidth: 2 })}
      {corner({ right: 44, top: 44, borderRightWidth: 2, borderTopWidth: 2 })}
      {corner({ left: 44, bottom: 44, borderLeftWidth: 2, borderBottomWidth: 2 })}
      {corner({ right: 44, bottom: 44, borderRightWidth: 2, borderBottomWidth: 2 })}
      <div style={{ ...text, left: 84, top: 50 }}><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', marginRight: 10, background: dark ? C.ring : C.blue }} />CALENDARKIT 2.0</div>
      <div style={{ ...text, right: 84, top: 50 }}>SCENE {String(scene).padStart(2, '0')} / {total}</div>
      <div style={{ ...text, left: 84, bottom: 50 }}>{label}</div>
      <div style={{ ...text, right: 84, bottom: 50 }}>{tc}</div>
    </>
  )
}
