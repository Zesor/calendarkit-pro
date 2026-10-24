// The scenes, in order. Each one counts its frames from 0; 15 frames are one beat.
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion'
import { Badge, Blur, C, Cursor, Feature, MONO, Ripple, Rise, SANS, Shot, Slam, WIN, display, easeInOut, fit, lens, m, mono, press, serif, track, tween, typed, type Box, type Cam } from './kit'

const pad = (n: number) => String(n).padStart(2, '0')
const center = (r: { x: number; y: number; w: number; h: number }) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })
// The largest window that keeps clear of the HUD in the corners.
const FULL: Box = { x: 250, y: 96, w: 1420, h: 887.5 }
const WHOLE: Cam = { cx: 720, cy: 450, z: 1 }

/** 0 to 1.5 s: the downloads, counted up. Opens on the dot the video ends on. */
export function Thanks() {
  const f = useCurrentFrame()
  const n = Math.round(tween(f, 6, 26, 0, 50000, Easing.out(Easing.cubic)))
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <div style={{ position: 'absolute', left: 946, top: 526, width: 28, height: 28, borderRadius: '50%', background: C.ink, transform: `scale(${interpolate(f, [0, 3, 6], [1, 1.6, 0], { extrapolateRight: 'clamp' })})` }} />
      {f >= 6 && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 290, textAlign: 'center', ...display(290), fontVariantNumeric: 'tabular-nums' }}>
          {n.toLocaleString('en-US')}<span style={{ color: C.blue }}>+</span>
        </div>
      )}
      <Rise at={16} style={{ position: 'absolute', left: 0, right: 0, top: 600, textAlign: 'center', ...mono(26), letterSpacing: '0.3em' }}>DOWNLOADS ON NPM</Rise>
      <Rise at={24} style={{ position: 'absolute', left: 0, right: 0, top: 690, textAlign: 'center', ...serif(124) }}>Thank you.</Rise>
    </AbsoluteFill>
  )
}

// The issues and pull requests the community opened (github.com/Zesor/calendarkit-pro).
const ASKS = [
  ['#1', 'All-day events', '@HannanSolo'],
  ['#2', 'Reverse time axis', '@Sayzera'],
  ['#3', 'Translated agenda and sidebar', '@eduBKR'],
  ['#4', 'Per-event drag and resize', '@jesusvillamarin'],
  ['#5', 'Month grid week start', '@remkodejong'],
]

/** 1.5 to 3 s: what they asked for, then ticked. */
export function Asked() {
  const f = useCurrentFrame()
  const swap = 28
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <div style={{ position: 'absolute', left: 140, top: 140, width: 1640, height: 160, overflow: 'hidden' }}>
        {f < swap
          ? <Slam at={0} style={display(150, C.paper)}>YOU ASKED.</Slam>
          : <Slam at={swap} axis="y" dist={160} style={display(150, C.paper)}>WE LISTENED.</Slam>}
      </div>
      <div style={{ position: 'absolute', left: 140, right: 140, top: 370 }}>
        {ASKS.map(([n, title, who], i) => {
          const o = tween(f, 6 + i * 3, 12 + i * 3, 0, 1)
          const k = tween(f, swap + 2 + i * 2, swap + 8 + i * 2, 0, 1)
          return (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 36, height: 94, borderTop: `1px solid #2f2f36`, opacity: o, transform: `translateX(${(1 - o) * 90}px)` }}>
              <span style={{ ...mono(28, C.ring), width: 64 }}>{n}</span>
              <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 46, letterSpacing: '-0.02em', color: C.paper, flex: 1 }}>{title}</span>
              <span style={mono(26, C.nightSub)}>{who}</span>
              <svg width="44" height="44" viewBox="0 0 44 44" style={{ opacity: k, transform: `scale(${0.6 + 0.4 * k})` }} aria-hidden>
                <circle cx="22" cy="22" r="22" fill={C.ring} />
                <path d="M13 22.5l6 6L31 16" fill="none" stroke={C.ink} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - k} />
              </svg>
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}

/** 3 to 5 s: the gift. */
export function Welcome() {
  const f = useCurrentFrame()
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <AbsoluteFill style={{ transform: `scale(${tween(f, 0, 60, 1, 1.05, easeInOut)})` }}>
        <Rise at={0} style={{ position: 'absolute', left: 0, right: 0, top: 250, textAlign: 'center', ...serif(130) }}>A gift:</Rise>
        <Slam at={14} from={-1} style={{ position: 'absolute', left: 0, right: 0, top: 450, textAlign: 'center', ...display(120) }}>WELCOME TO</Slam>
        <Slam at={26} style={{ position: 'absolute', left: 0, right: 0, top: 590, textAlign: 'center', ...display(170) }}>CALENDARKIT <Badge at={33}>2.0</Badge></Slam>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

/** 5 to 7 s: one install, one component, and the calendar is there. */
export function Setup() {
  const f = useCurrentFrame()
  const k = tween(f, 40, 52, 0, 1)
  const box: Box = { x: interpolate(k, [0, 1], [1010, FULL.x]), y: interpolate(k, [0, 1], [1100, FULL.y]), w: interpolate(k, [0, 1], [780, FULL.w]), h: interpolate(k, [0, 1], [487.5, FULL.h]) }
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <AbsoluteFill style={{ opacity: tween(f, 40, 48, 1, 0) }}>
        <div style={{ position: 'absolute', left: 140, top: 250 }}>
          <Slam at={0} style={display(210)}>ZERO</Slam>
          <Slam at={3} style={display(210)}>SETUP.</Slam>
          <Rise at={10} style={{ ...serif(52), marginTop: 34 }}>No Tailwind. Nothing to import.</Rise>
        </div>
        <Rise at={2} style={{ position: 'absolute', left: 1010, top: 340, width: 780, padding: '38px 42px', borderRadius: 22, background: C.mist, border: `1px solid ${C.line}` }}>
          <div style={mono(30)}>{typed('$ npm install calendarkit-pro', f, 4, 3)}</div>
          <div style={{ ...mono(30, C.ink), marginTop: 26 }}>{typed('<Scheduler defaultEvents={events} />', f, 15, 3)}</div>
        </Rise>
      </AbsoluteFill>
      {f >= 40 && <Shot src="week" cam={{ ...WHOLE, z: tween(f, 50, 60, 1, 1.04, easeInOut) }} box={box} />}
    </AbsoluteFill>
  )
}

// Light and dark of each theme, a cut every quarter second.
const THEMES = ['CALM', 'VIVID', 'EDITORIAL']
const THEME_CUTS = [0, 8, 15, 23, 30, 38]
const themeShot = (f: number) => THEME_CUTS.filter((c) => f >= c).length - 1
export const themeIsDark = (f: number) => themeShot(f) % 2 === 1

/** 7 to 8.5 s: three themes, light and dark. */
export function Themes() {
  const f = useCurrentFrame()
  const i = themeShot(f)
  const name = THEMES[Math.floor(i / 2)]
  const dark = i % 2 === 1
  return (
    <AbsoluteFill style={{ background: dark ? C.night : C.mist }}>
      <Shot src={`theme-${name.toLowerCase()}${dark ? '-dark' : ''}`} cam={{ cx: 800, cy: 470, z: tween(f, 0, 45, 1, 1.1, easeInOut) }} box={FULL} dark={dark} />
      <div style={{ position: 'absolute', left: 230, bottom: 130, padding: '22px 34px 26px', borderRadius: 22, background: dark ? C.paper : C.ink, display: 'flex', alignItems: 'baseline', gap: 26 }}>
        <Slam key={name} at={Math.floor(i / 2) * 15} dist={120} style={display(84, dark ? C.ink : C.paper)}>{name}</Slam>
        <span style={mono(22, dark ? C.sub : C.nightSub)}>{dark ? 'DARK' : 'LIGHT'}</span>
      </div>
    </AbsoluteFill>
  )
}

/** 8.5 to 11 s: a click on free time, a sentence, an event. */
export function Create() {
  const f = useCurrentFrame()
  const c = m.create
  const slot = center(c.slot)
  const typing = 17
  const done = typing + c.frames + 8
  const card = fit([{ ...c.card, h: 235 }], WIN, 36)
  const cam = track(f, [
    { f: 0, ...WHOLE },
    { f: 10, cx: slot.x, cy: slot.y, z: 1.25 },
    { f: typing, ...card },
    { f: done, ...card, z: card.z * 1.04 },
    { f: done + 8, ...fit([c.event, c.toast], WIN, 50) },
  ])
  const src = f < 12 ? 'week' : f < typing ? 'create-00' : f < typing + c.frames ? `create-${pad(f - typing + 1)}` : f < done ? `create-${pad(c.frames)}` : 'create-done'
  const L = lens(cam, WIN)
  const p = L.map(track(f, [{ f: 0, x: slot.x + 260, y: slot.y + 320 }, { f: 10, ...slot }]))
  return (
    <AbsoluteFill style={{ background: C.mist }}>
      <Feature lines={['JUST', 'TYPE IT.']} aside="The quick card reads the sentence." detail="ENGLISH · FRENCH" />
      <Shot src={src} cam={cam}>
        <Ripple x={p.x} y={p.y} at={11} />
        <Cursor x={p.x} y={p.y} press={press(f, 11)} opacity={tween(f, 15, 19, 1, 0)} />
      </Shot>
    </AbsoluteFill>
  )
}

/** 11 to 12 s: delete, then Undo. */
export function Undo() {
  const f = useCurrentFrame()
  const u = m.undo
  // The card and its Delete first, then down to the toast and the event coming back.
  const cam = track(f, [{ f: 0, ...fit([u.event, u.delete], WIN, 50) }, { f: 9, ...fit([u.event, u.delete], WIN, 50) }, { f: 15, ...fit([u.event, u.undo], WIN, 50) }])
  const L = lens(cam, WIN)
  const [del, undo] = [center(u.delete), center(u.undo)]
  const p = L.map(track(f, [{ f: 0, x: del.x + 90, y: del.y + 70 }, { f: 7, ...del }, { f: 10, ...del }, { f: 17, ...undo }]))
  return (
    <AbsoluteFill style={{ background: C.mist }}>
      <Feature lines={['UNDO.']} aside="Every change shows Undo." detail="CREATE · MOVE · DELETE" />
      <Shot src={f < 9 ? 'undo-0' : f < 19 ? 'undo-1' : 'undo-2'} cam={cam}>
        <Ripple x={p.x} y={p.y} at={8} />
        <Ripple x={p.x} y={p.y} at={18} />
        <Cursor x={p.x} y={p.y} press={Math.max(press(f, 8), press(f, 18))} opacity={tween(f, 22, 26, 1, 0)} />
      </Shot>
    </AbsoluteFill>
  )
}

/** 12 to 13 s: a real drag, from Tuesday to Thursday. */
export function Drag() {
  const f = useCurrentFrame()
  const d = m.drag
  const cam = fit([d.from, { x: d.end.x - d.from.w / 2, y: d.end.y - 18, w: d.from.w, h: d.from.h }], WIN, 70)
  const L = lens(cam, WIN)
  const i = Math.min(Math.max(f - 1, 0), d.frames) // drag-01 at frame 2
  const src = f < 2 ? 'week' : f < 2 + d.frames ? `drag-${pad(i)}` : 'drag-done'
  const at = i === 0 ? d.start : d.path[i - 1]
  const p = L.map(f < 1 ? { x: d.start.x + 50, y: d.start.y + 40 } : at)
  const prev = L.map(i <= 1 ? d.start : d.path[i - 2])
  const id = 'drag-blur'
  return (
    <AbsoluteFill style={{ background: C.mist }}>
      <Feature lines={['DRAG.', 'DROP.']} aside="It snaps to the grid as you move." detail="MOVE · RESIZE" />
      <Shot src={src} cam={cam}>
        <div style={{ position: 'absolute', inset: 0, filter: f >= 2 && f < 2 + d.frames ? `url(#${id})` : undefined }}>
          <Blur id={id} x={(p.x - prev.x) * 0.4} y={(p.y - prev.y) * 0.4} />
          <Cursor x={p.x} y={p.y} press={f >= 1 && f < 2 + d.frames ? 1 : 0} />
        </div>
      </Shot>
    </AbsoluteFill>
  )
}

const VIEWS = [['view-month', 'MONTH'], ['week', 'WEEK'], ['view-day', 'DAY'], ['view-agenda', 'AGENDA'], ['view-resource', 'RESOURCE']]

/** 13 to 15 s: the five views. */
export function Views() {
  const f = useCurrentFrame()
  const i = Math.min(4, Math.floor(f / 12))
  return (
    <AbsoluteFill style={{ background: C.mist }}>
      <div style={{ position: 'absolute', left: 130, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 40 }}>
        <div>
          <Slam at={0} style={display(92)}>FIVE</Slam>
          <Slam at={3} style={display(92)}>VIEWS.</Slam>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {VIEWS.map(([, name], k) => (
            <div key={name} style={{ ...mono(24, k === i ? C.ink : '#a1a1aa'), display: 'flex', alignItems: 'center', gap: 16, opacity: tween(f, 6 + k * 2, 10 + k * 2, 0, 1) }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: k === i ? C.blue : 'transparent', border: `2px solid ${k === i ? C.blue : '#c4c4cc'}` }} />
              {name}
            </div>
          ))}
        </div>
      </div>
      <Shot src={VIEWS[i][0]} cam={{ ...WHOLE, z: 1 + (f % 12) * 0.004 }} />
    </AbsoluteFill>
  )
}

const LAYOUTS = [['week', 'CLASSIC.'], ['layout-focus', 'FOCUS.'], ['layout-flow', 'FLOW.']]

/** 15 to 17 s: the three layouts on a tilted plane, the camera travelling along. */
export function Layouts() {
  const f = useCurrentFrame()
  const W = 1100, H = 688, GAP = 170
  const at = (t: number) => track(t, [{ f: 0, x: 0 }, { f: 14, x: 0 }, { f: 20, x: 1 }, { f: 34, x: 1 }, { f: 40, x: 2 }, { f: 60, x: 2 }]).x
  const x = at(f)
  const i = f < 17 ? 0 : f < 37 ? 1 : 2
  const v = (at(f) - at(f - 1)) * (W + GAP)
  return (
    <AbsoluteFill style={{ background: C.mist }}>
      <div style={{ position: 'absolute', left: 140, top: 110, display: 'flex', alignItems: 'baseline', gap: 30 }}>
        <Slam key={i} at={[0, 17, 37][i]} style={display(110)}>{LAYOUTS[i][1]}</Slam>
        <span style={mono(22)}>LAYOUT {i + 1}/3</span>
      </div>
      <div style={{ position: 'absolute', left: 960 - W / 2, top: 300, width: W, height: H, perspective: 2600, filter: Math.abs(v) > 1 ? 'url(#layouts-blur)' : undefined }}>
        <Blur id="layouts-blur" x={v * 0.22} />
        <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transform: `rotateX(10deg) rotateY(-12deg) translateX(${-x * (W + GAP)}px)` }}>
          {LAYOUTS.map(([src], k) => <Shot key={src} src={src} cam={WHOLE} box={{ x: k * (W + GAP), y: 0, w: W, h: H }} />)}
        </div>
      </div>
    </AbsoluteFill>
  )
}

/** 17 to 18.5 s: working hours, then the axis flips (issue #2). */
export function Grid() {
  const f = useCurrentFrame()
  const flip = 15
  const sy = f < flip ? 1 : f < flip + 6 ? tween(f, flip, flip + 6, 1, 0, Easing.in(Easing.cubic)) : tween(f, flip + 6, flip + 12, 0, 1)
  const reversed = f >= flip + 6
  const cam: Cam = { cx: 800, cy: 520, z: 1.1 }
  const L = lens(cam, WIN)
  const hours = reversed ? m.reverse.hours : m.week.hours
  const [top, bottom] = reversed ? [hours['6 PM'], hours['9 AM']] : [hours['9 AM'], hours['6 PM']]
  // The bracket runs down the grid's left edge, from the first working hour to the last.
  const a = L.map({ x: 341, y: top }), b = L.map({ x: 341, y: bottom })
  const grow = reversed ? 1 : tween(f, 2, 11, 0, 1)
  return (
    <AbsoluteFill style={{ background: C.mist }}>
      <Feature lines={['YOUR', 'HOURS.']} aside="Working hours. A reversed axis." />
      <div style={{ position: 'absolute', left: 130, top: 760, ...mono(20) }}>
        <div style={{ color: C.blue }}>{typed('LATEST HOURS ON TOP', f, flip + 8, 3)}</div>
        <div style={{ marginTop: 8 }}>{typed('ISSUE #2 · @Sayzera', f, flip + 12, 3)}</div>
      </div>
      <Shot src={reversed ? 'grid-reverse' : 'week'} cam={cam} style={{ transform: `scaleY(${sy})` }}>
        <div style={{ position: 'absolute', left: a.x - 3, top: a.y, width: 6, height: (b.y - a.y) * grow, borderRadius: 3, background: C.blue }} />
      </Shot>
    </AbsoluteFill>
  )
}

/** 18.5 to 19.5 s: a place typed, OpenStreetMap answers. */
export function Places() {
  const f = useCurrentFrame()
  const p = m.place
  const cam = fit([p.field, { ...p.list, h: Math.min(p.list.h, 890 - p.list.y) }], WIN, 34)
  const src = f < 3 ? 'place-00' : f < 3 + p.frames ? `place-${pad(f - 2)}` : 'place-done'
  return (
    <AbsoluteFill style={{ background: C.mist }}>
      <Feature lines={['REAL', 'PLACES.']} aside="Suggestions from OpenStreetMap." detail="OPTIONAL · placeSearch" />
      <Shot src={src} cam={{ ...cam, z: cam.z * tween(f, 0, 30, 0.97, 1.02) }} />
    </AbsoluteFill>
  )
}

/** 19.5 to 21.5 s: the focus ring hops; each stop says what it is. */
export function A11y() {
  const f = useCurrentFrame()
  const T = m.a11y
  const i = Math.min(3, Math.floor(f / 15))
  const aim = (k: number): Cam => ({ cx: center(T[k]).x, cy: center(T[k]).y, z: 2 })
  const cam = i === 0 ? aim(0) : track(f, [{ f: i * 15, ...aim(i - 1) }, { f: i * 15 + 6, ...aim(i) }])
  return (
    <AbsoluteFill style={{ background: C.night }}>
      <Feature dark lines={['EVERY', 'EVENT,', 'A BUTTON.']} aside="No shortcuts to learn." detail="TAB · ENTER · SPACE · ESC" />
      <Shot src={`a11y-${i}`} cam={{ cx: cam.cx, cy: cam.cy, z: cam.z }} dark>
        <div style={{ position: 'absolute', left: 24, right: 24, bottom: 24, padding: '18px 22px', borderRadius: 14, background: C.panel, border: `1px solid #34343c`, display: 'flex', gap: 18 }}>
          <span style={mono(18, C.ring)}>BUTTON</span>
          <span style={{ ...mono(18, C.paper), overflow: 'hidden' }}>{typed(T[i].label, f, i * 15 + 1, 9)}</span>
        </div>
      </Shot>
    </AbsoluteFill>
  )
}

/** 21.5 to 23 s: the phone layout, a tap, the bottom sheet. */
export function Phone() {
  const f = useCurrentFrame()
  const P = m.phone
  const w = 412, h = (412 * P.h) / P.w
  const screen: Box = { x: 1250 - w / 2, y: (1080 - h) / 2, w, h }
  const s = w / P.w
  const tap = { x: center(m.phoneEvent).x * s, y: center(m.phoneEvent).y * s }
  const k = tween(f, 23, 31, 0, 1)
  const img = { position: 'absolute', left: 0, top: 0, width: P.w, height: P.h, maxWidth: 'none', transformOrigin: '0 0', transform: `scale(${s})` } as const
  const t = tween(f, 0, 12, 1, 0)
  return (
    <AbsoluteFill style={{ background: C.mist }}>
      <Feature lines={['READY FOR', 'PHONES.']} aside="Under 768 px of calendar width." detail="DAY VIEW · DRAWER · SHEETS" />
      <div style={{ position: 'absolute', left: screen.x - 14, top: screen.y - 14, width: w + 28, height: h + 28, borderRadius: 66, background: C.ink, padding: 14, transform: `translateY(${t * 420}px) rotate(${t * -6}deg)` }}>
        <div style={{ position: 'relative', width: w, height: h, borderRadius: 52, overflow: 'hidden', background: C.paper }}>
          <Img src={staticFile('captures/phone-0.png')} style={img} />
          {f >= 23 && <Img src={staticFile('captures/phone-1.png')} style={{ ...img, clipPath: `inset(${(1 - k) * 100}% 0 0 0)` }} />}
          {f >= 17 && f < 26 && <div style={{ position: 'absolute', left: tap.x - 24, top: tap.y - 24, width: 48, height: 48, borderRadius: '50%', background: 'rgb(23 23 26 / 0.28)', transform: `scale(${tween(f, 17, 21, 0.4, 1)})`, opacity: tween(f, 22, 26, 1, 0) }} />}
        </div>
      </div>
    </AbsoluteFill>
  )
}

/** 23 to 25.5 s: the styles fall away, the engine's layout stays. */
export function Core() {
  const f = useCurrentFrame()
  const L = lens(WHOLE, WIN)
  const s = L.s
  const slots = m.week.slots.filter((r) => r.y >= 205 && r.y + r.h <= 900)
  const code = "import { createCalendar }\n  from 'calendarkit-pro/core'\n\ncreateCalendar({ defaultEvents })"
  return (
    <AbsoluteFill style={{ background: C.night }}>
      <div style={{ position: 'absolute', left: 130, top: 0, bottom: 0, width: 540, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 34 }}>
        <div>
          <Slam at={4} style={display(92, C.paper)}>THE</Slam>
          <Slam at={7} style={display(92, C.paper)}>ENGINE.</Slam>
          <Slam at={10} style={display(92, C.ring)}>NO REACT.</Slam>
        </div>
        <div style={{ ...mono(20, C.paper), lineHeight: 1.6, minHeight: 130 }}>{typed(code, f, 18, 3)}</div>
        <Slam at={52} dist={160} style={{ ...mono(20, C.nightSub), letterSpacing: '0.1em' }}>SERVER RENDERING · REACT 18 & 19</Slam>
      </div>
      <Shot src="theme-calm-dark" cam={WHOLE} dark>
        <div style={{ position: 'absolute', inset: 0, background: C.night, opacity: tween(f, 6, 20, 0, 1) }} />
        <svg width={WIN.w} height={WIN.h} style={{ position: 'absolute', inset: 0 }} aria-hidden>
          <g stroke="#ffffff" strokeOpacity={tween(f, 10, 20, 0, 0.09)} fill="none">
            {slots.map((r, k) => { const a = L.map(r); return <rect key={k} x={a.x} y={a.y} width={r.w * s} height={r.h * s} /> })}
          </g>
          {m.week.events.filter((e) => e.y >= 160 && e.y < 900).map((e, k) => {
            const a = L.map(e)
            const t = tween(f, 12 + k, 24 + k, 0, 1)
            return (
              <g key={k}>
                <rect x={a.x + 1} y={a.y + 1} width={e.w * s - 2} height={Math.min(e.h, 900 - e.y) * s - 2} rx={7} fill="none" stroke={C.ring} strokeWidth={2} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - t} />
                {e.h > 26 && <text x={a.x + 10} y={a.y + 22} fill="#ffffff" fillOpacity={0.7 * t} fontFamily={MONO} fontSize={13}>{e.title}</text>}
              </g>
            )
          })}
        </svg>
      </Shot>
    </AbsoluteFill>
  )
}

/** 25.5 to 30 s: install, name, address. */
export function End() {
  const f = useCurrentFrame()
  const up = tween(f, 28, 40, 0, 1)
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: interpolate(up, [0, 1], [490, 800]), textAlign: 'center', ...mono(interpolate(up, [0, 1], [62, 34]), C.ink) }}>
        <span style={{ color: '#a1a1aa' }}>$ </span>{typed('npm install calendarkit-pro', f, 2, 1.6)}
        <span style={{ display: 'inline-block', width: '0.6em', height: '1.05em', verticalAlign: '-0.18em', marginLeft: 6, background: Math.floor(f / 8) % 2 ? 'transparent' : C.ink }} />
      </div>
      <Slam at={32} style={{ position: 'absolute', left: 0, right: 0, top: 350, textAlign: 'center', ...display(170) }}>CALENDARKIT <Badge at={40}>2.0</Badge></Slam>
      <Rise at={44} style={{ position: 'absolute', left: 0, right: 0, top: 575, textAlign: 'center', ...serif(78) }}>The new CalendarKit.</Rise>
      <Rise at={50} style={{ position: 'absolute', left: 0, right: 0, top: 892, textAlign: 'center', ...mono(30, C.blue), letterSpacing: '0.1em' }}>calendarkit.io</Rise>
    </AbsoluteFill>
  )
}

export const soonIsDark = (f: number) => f < 80

/** 30 to 33 s: what comes next, then the iris closes on the opening dot. */
export function Soon() {
  const f = useCurrentFrame()
  const clear = 50
  const r = tween(f, 70, 89, 1300, 14, easeInOut)
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <AbsoluteFill style={{ background: C.ink, clipPath: `circle(${r}px at 960px 540px)` }}>
        {f < clear ? (
          <>
            <Rise at={0} style={{ position: 'absolute', left: 146, top: 180, ...mono(22, C.nightSub), letterSpacing: '0.3em' }}>COMING NEXT</Rise>
            <Slam at={6} style={{ position: 'absolute', left: 140, top: 240, ...display(230, C.paper) }}>VUE.</Slam>
            <Slam at={18} style={{ position: 'absolute', left: 140, top: 460, ...display(230, C.paper) }}>ANGULAR.</Slam>
            <Rise at={30} style={{ position: 'absolute', left: 146, top: 720, ...serif(76, C.paper) }}>same engine.</Rise>
            <Rise at={34} style={{ position: 'absolute', left: 150, top: 836, ...mono(26, C.ring) }}>calendarkit-pro/core</Rise>
          </>
        ) : (
          <Slam at={clear} axis="y" dist={220} style={{ position: 'absolute', left: 0, right: 0, top: 390, textAlign: 'center', ...display(300, C.paper), opacity: tween(f, 76, 82, 1, 0) }}>SOON.</Slam>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
