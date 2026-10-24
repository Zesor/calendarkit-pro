// Captures the real demo for the launch video: headless Chrome over the DevTools protocol, as
// scripts/screenshots.mjs does, with the clock fixed so every run shows the same week.
// `npm run dev` at the repository root, then `npm run capture` here (macOS Chrome path; Node 22+).
// Writes public/captures/*.png and manifest.json (element boxes in CSS px, for the cursor and camera).
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const BASE = process.env.DEMO_URL ?? 'http://localhost:3000/'
const OUT = 'public/captures'
// Tuesday 20 October 2026, 10:15 in Paris: "tomorrow" is still in the week on screen.
const NOW = Date.parse('2026-10-20T10:15:00+02:00')
const SENTENCE = 'Lunch with Lea tomorrow 1pm for 2h'
const PLACE = 'Café de Flore'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const CLOCK = `(() => {
  const Real = Date, offset = ${NOW} - Real.now()
  globalThis.Date = class extends Real {
    constructor(...a) { if (a.length) super(...a); else super(Real.now() + offset) }
    static now() { return Real.now() + offset }
  }
})()`
// The calendar alone, filling the viewport: no demo header, padding or frame.
const CHROME_OFF = `(() => { const s = document.createElement('style'); s.textContent = '.demo { padding: 0 !important } .demo-header { display: none !important } .demo-inner { max-width: none !important } .demo-frame { height: 100vh !important; border: 0 !important; border-radius: 0 !important } nextjs-portal { display: none !important }'; document.head.appendChild(s); return true })()`

const profile = join(tmpdir(), `ck-video-${Date.now()}`)
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--remote-debugging-port=9334', `--user-data-dir=${profile}`, '--hide-scrollbars', '--force-color-profile=srgb', 'about:blank'], { stdio: 'ignore' })
let targets
for (let i = 0; i < 50 && !targets; i++) {
  await sleep(200)
  targets = await fetch('http://127.0.0.1:9334/json').then((r) => r.json()).catch(() => undefined)
}
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r))
let id = 0
const pending = new Map()
ws.addEventListener('message', (m) => {
  const msg = JSON.parse(m.data)
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) }
})
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const n = ++id
  pending.set(n, (msg) => (msg.error ? reject(new Error(`${method}: ${msg.error.message}`)) : resolve(msg.result)))
  ws.send(JSON.stringify({ id: n, method, params }))
})
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) throw new Error(`${expression.slice(0, 100)}: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`)
  return r.result.value
}

// Elements are found by their accessible name, the way a screen reader user meets them.
const byLabel = (re) => `[...document.querySelectorAll('button')].find((b) => ${re}.test(b.getAttribute('aria-label') || ''))`
const byText = (re, scope = 'document') => `[...${scope}.querySelectorAll('button')].find((b) => ${re}.test(b.textContent.trim()))`
const box = async (el) => {
  const b = await evaluate(`(() => { const el = ${el}; if (!el) throw new Error('not found'); const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, label: el.getAttribute('aria-label') || undefined } })()`)
  return Object.fromEntries(Object.entries(b).map(([k, v]) => [k, typeof v === 'number' ? Math.round(v * 10) / 10 : v]))
}
const click = (el) => evaluate(`(() => { const el = ${el}; if (!el) throw new Error('not found'); el.click(); return true })()`)
const key = async (k, code = k, vk = 0) => {
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk })
}
const mouse = (type, x, y) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 })
const shot = async (name) => {
  const { data } = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(join(OUT, `${name}.png`), Buffer.from(data, 'base64'))
}
const open = async (query, { w = 1440, h = 900, mobile = false } = {}) => {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile })
  await send('Page.navigate', { url: `${BASE}?tz=local&hour=8&${query}` })
  await sleep(3000)
  await evaluate(CHROME_OFF)
  await sleep(600)
}
// Hour labels place the camera on the hours that matter: `edge` reads one, `scrollLabelTo` scrolls
// the grid holding it until it starts at `to` (CSS px).
const hourLabel = (text) => `[...document.querySelectorAll('.ck-root *')].find((e) => !e.children.length && e.getClientRects().length && e.textContent.trim() === ${JSON.stringify(text)})`
const edge = (text, axis) => evaluate(`${hourLabel(text)}.getBoundingClientRect().${axis === 'x' ? 'left' : 'top'}`)
const scrollLabelTo = (text, axis, to) => evaluate(`(() => {
  const label = ${hourLabel(text)}
  const [side, pos, size, client, overflow] = ${axis === 'x' ? "['left', 'scrollLeft', 'scrollWidth', 'clientWidth', 'overflowX']" : "['top', 'scrollTop', 'scrollHeight', 'clientHeight', 'overflowY']"}
  // The largest scroller on that axis: the grid body, which the header strips follow.
  const s = [...document.querySelectorAll('.ck-root *')].filter((e) => e[size] > e[client] + 1 && /auto|scroll/.test(getComputedStyle(e)[overflow])).sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0]
  s[pos] += label.getBoundingClientRect()[side] - ${to}
  return true
})()`)
const hours = () => evaluate(`Object.fromEntries([...document.querySelectorAll('.ck-root *')].filter((e) => !e.children.length && e.getClientRects().length && /^\\d{1,2} (AM|PM)$/.test(e.textContent.trim())).map((e) => { const r = e.getBoundingClientRect(); return [e.textContent.trim(), r.y + r.height / 2] }))`)
const typeInto = async (prefix, text) => {
  for (let i = 0; i < text.length; i++) {
    await send('Input.insertText', { text: text[i] })
    await sleep(140)
    await shot(`${prefix}-${String(i + 1).padStart(2, '0')}`)
  }
}

await send('Page.enable')
await send('Page.addScriptToEvaluateOnNewDocument', { source: CLOCK })
await send('Emulation.setTimezoneOverride', { timezoneId: 'Europe/Paris' })
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })
const m = { now: new Date(NOW).toISOString(), viewport: { w: 1440, h: 900 }, phone: { w: 390, h: 844 }, sentence: SENTENCE, place: PLACE }
const step = (name) => console.log('captured', name)

// The week, plus the boxes of its events and hour slots: the engine's layout, drawn as a wireframe.
await open('')
await shot('week')
m.week = await evaluate(`(() => {
  const r = (el) => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height } }
  const events = [...document.querySelectorAll('.ck-root .ck-event')].map((el) => ({ ...r(el), title: (el.getAttribute('aria-label') || el.textContent).split(',')[0].trim() }))
  const slots = [...document.querySelectorAll('button')].filter((b) => /^Create an event on /.test(b.getAttribute('aria-label') || '')).map(r)
  return { events, slots }
})()`)
m.week.hours = await hours()
step('week')

for (const theme of ['calm', 'vivid', 'editorial']) {
  for (const dark of [false, true]) {
    await open(`theme=${theme}${dark ? '&dark=1' : ''}`)
    await shot(`theme-${theme}${dark ? '-dark' : ''}`)
  }
}
step('themes')

// Create in place: a click on free time, then a sentence typed into the quick card.
await open('')
m.create = { slot: await box(byLabel('/^Create an event on Tuesday .* at 11:00 AM$/')) }
await click(byLabel('/^Create an event on Tuesday .* at 11:00 AM$/'))
await sleep(700)
await shot('create-00')
await evaluate("document.querySelector('[role=dialog] input').focus(), true")
await typeInto('create', SENTENCE)
m.create.frames = SENTENCE.length
m.create.card = await box("document.querySelector('[role=dialog]')")
m.create.input = await box("document.querySelector('[role=dialog] input')")
m.create.ghost = await box("document.querySelector('[data-ck-ghost]')")
await key('Enter', 'Enter', 13)
await sleep(900)
await shot('create-done')
m.create.event = await box(byLabel('/^Lunch with Lea/'))
m.create.toast = await box(byText('/^Undo$/'))
step('create')

// Places: the same card, a place typed into its location field.
await open('')
await click(byLabel('/^Create an event on Tuesday .* at 11:00 AM$/'))
await sleep(700)
await evaluate("document.querySelector('[role=dialog] input').focus(), true")
await send('Input.insertText', { text: SENTENCE })
await sleep(400)
await click(byText('/^Add location$/', "document.querySelector('[role=dialog]')"))
await sleep(500)
await shot('place-00')
await typeInto('place', PLACE)
m.place = { frames: PLACE.length }
for (let i = 0; i < 40 && !(await evaluate("!!document.querySelector('[role=listbox]:not([hidden]) [role=option]')")); i++) await sleep(250)
await sleep(400)
await shot('place-done')
m.place.card = await box("document.querySelector('[role=dialog]')")
m.place.field = await box("document.querySelector('[role=dialog] [role=combobox], [role=dialog] input[id$=location]')")
m.place.list = await box("document.querySelector('[role=listbox]')")
m.place.options = await evaluate("[...document.querySelectorAll('[role=listbox] [role=option]')].map((o) => o.textContent.trim())")
step('place')

// Undo: delete from the event card, then Undo in the toast.
await open('')
m.undo = { event: await box(byLabel('/^Code Review/')) }
await click(byLabel('/^Code Review/'))
await sleep(700)
await shot('undo-0')
m.undo.delete = await box(byText('/^Delete$/', "document.querySelector('[role=dialog]')"))
await click(byText('/^Delete$/', "document.querySelector('[role=dialog]')"))
await sleep(700)
await shot('undo-1')
m.undo.undo = await box(byText('/^Undo$/'))
await click(byText('/^Undo$/'))
await sleep(700)
await shot('undo-2')
step('undo')

// Drag and drop: Code Review from Tuesday 2 PM to Thursday 3 PM, with a real pointer.
await open('')
{
  const from = await box(byLabel('/^Code Review/'))
  const a = await box(byLabel('/^Create an event on Tuesday .* at 2:00 PM$/'))
  const b = await box(byLabel('/^Create an event on Thursday .* at 3:00 PM$/'))
  const start = { x: from.x + from.w / 2, y: from.y + 18 }
  const end = { x: start.x + b.x - a.x, y: start.y + b.y - a.y }
  const steps = 14
  m.drag = { from, start, end, path: [] }
  await mouse('mouseMoved', start.x, start.y)
  await mouse('mousePressed', start.x, start.y)
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const e = t * t * (3 - 2 * t)
    const p = { x: start.x + (end.x - start.x) * e, y: start.y + (end.y - start.y) * e }
    await mouse('mouseMoved', p.x, p.y)
    await sleep(120)
    await shot(`drag-${String(i).padStart(2, '0')}`)
    m.drag.path.push(p)
  }
  await mouse('mouseReleased', end.x, end.y)
  await sleep(800)
  await shot('drag-done')
  m.drag.frames = steps
}
step('drag')

for (const view of ['month', 'day&day=2', 'agenda', 'resource']) {
  await open(`view=${view}`)
  // The resource timeline opens at midnight: bring 8 AM to its start, like the other views.
  if (view === 'resource') await scrollLabelTo('8 AM', 'x', await edge('12 AM', 'x'))
  await sleep(300)
  await shot(`view-${view.split('&')[0]}`)
}
step('views')

await open('layout=focus')
await click(byLabel('/^Workshop/'))
await sleep(900)
await shot('layout-focus')
await open('layout=flow&day=2')
await shot('layout-flow')
step('layouts')

// The time grid with its axis reversed (issue #2), through the demo's own checkbox.
// Framed as the mirror of the week: 7 PM where 8 AM was.
await open('')
const top = await edge('8 AM', 'y')
await click("document.querySelector('.demo-header input[type=checkbox]')")
await sleep(900)
await scrollLabelTo('7 PM', 'y', top + 12)
await sleep(300)
await shot('grid-reverse')
m.reverse = { hours: await hours() }
step('grid')

// Keyboard: after a Tab the focus ring shows; each stop is a named button.
await open('dark=1')
await key('Tab', 'Tab', 9)
m.a11y = []
for (const target of [byLabel('/^Project Review/'), byLabel('/^Create an event on Tuesday .* at 11:00 AM$/'), byLabel('/^Workshop/'), byLabel('/^Sprint Planning/')]) {
  await evaluate(`(${target}).focus(), true`)
  await sleep(300)
  await shot(`a11y-${m.a11y.length}`)
  m.a11y.push(await box('document.activeElement'))
}
step('a11y')

// The phone layout: the day view, then the event card as a bottom sheet.
await open('view=day&day=2', { w: 390, h: 844, mobile: true })
await shot('phone-0')
m.phoneEvent = await box(byLabel('/^Client Call/'))
await click(byLabel('/^Client Call/'))
await sleep(900)
await shot('phone-1')
step('phone')

writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(m, null, 2))
ws.close()
chrome.kill()
console.log('done:', OUT)
