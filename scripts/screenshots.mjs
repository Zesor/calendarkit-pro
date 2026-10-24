// Screenshots of the demo for the README: headless Chrome driven over the DevTools protocol.
// Regenerates docs/images (README screenshots) from the demo: `npm run dev`, then
// `node scripts/screenshots.mjs docs/images [name...]` (macOS Chrome path; needs Node 22+).
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const OUT = process.argv[2]
const ONLY = process.argv.slice(3)
const BASE = 'http://localhost:3140/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const click = (selectorJs) => `(() => { const el = ${selectorJs}; if (!el) throw new Error('not found'); el.click(); return true })()`
const byLabel = (re) => `[...document.querySelectorAll('button')].find((b) => ${re}.test(b.getAttribute('aria-label') || ''))`

const SHOTS = [
  { name: 'week', url: '?tz=local&hour=8', w: 1440, h: 900 },
  { name: 'event-card', url: '?tz=local&hour=8', w: 1440, h: 900, act: [click(byLabel('/^Code Review/'))] },
  { name: 'quick-create', url: '?tz=local&hour=8', w: 1440, h: 900, act: [click(byLabel('/^Create an event on Tuesday .* at 11:00 AM$/')), "(() => { const i = document.querySelector('[role=dialog] input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, 'Coffee with Alex'); i.dispatchEvent(new Event('input', { bubbles: true })); return true })()"] },
  { name: 'month-dark', url: '?tz=local&view=month&theme=editorial&dark=1', w: 1440, h: 900 },
  { name: 'focus', url: '?tz=local&hour=8&layout=focus', w: 1440, h: 900, act: [click(byLabel('/^Workshop/'))] },
  { name: 'flow', url: '?tz=local&layout=flow&theme=vivid&day=2', w: 1100, h: 900 },
  { name: 'phone', url: '?tz=local&hour=8&view=day&day=1', w: 390, h: 844, mobile: true },
  { name: 'phone-sheet', url: '?tz=local&hour=8&view=day&day=1', w: 390, h: 844, mobile: true, act: [click(byLabel('/^Project Review/'))] },
  ...['calm', 'vivid', 'editorial'].flatMap((t) => [
    { name: `theme-${t}`, url: `?tz=local&hour=8&theme=${t}`, w: 1440, h: 900 },
    { name: `theme-${t}-dark`, url: `?tz=local&hour=8&theme=${t}&dark=1`, w: 1440, h: 900 },
  ]),
  { name: 'undo-toast', url: '?tz=local&hour=8', w: 1440, h: 900, act: [click(byLabel('/^Code Review/')), click("[...document.querySelectorAll('[role=dialog] button')].find((b) => /^Delete$/.test(b.textContent.trim()))")] },
]

const profile = join(tmpdir(), `ck-shots-${Date.now()}`)
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--remote-debugging-port=9333', `--user-data-dir=${profile}`, '--hide-scrollbars', '--force-color-profile=srgb', 'about:blank'], { stdio: 'ignore' })
let targets
for (let i = 0; i < 50 && !targets; i++) {
  await sleep(200)
  targets = await fetch('http://127.0.0.1:9333/json').then((r) => r.json()).catch(() => undefined)
}
const page = targets.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
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
  if (r.exceptionDetails) throw new Error(`${expression.slice(0, 80)}: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`)
  return r.result.value
}
await send('Page.enable')
await send('Emulation.setTimezoneOverride', { timezoneId: 'Europe/Paris' })
mkdirSync(OUT, { recursive: true })
for (const shot of SHOTS.filter((s) => !ONLY.length || ONLY.includes(s.name))) {
  await send('Emulation.setDeviceMetricsOverride', { width: shot.w, height: shot.h, deviceScaleFactor: 2, mobile: !!shot.mobile })
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await send('Page.navigate', { url: BASE + shot.url })
  await sleep(3500)
  await evaluate("document.querySelector('.ck-root').scrollIntoView({ block: 'start' }); window.scrollBy(0, -16); true")
  await evaluate("(() => { const s = document.createElement('style'); s.textContent = 'nextjs-portal { display: none !important }'; document.head.appendChild(s); return true })()")
  for (const step of shot.act ?? []) { await evaluate(step); await sleep(700) }
  await sleep(500)
  const rect = await evaluate("(() => { const r = document.querySelector('.ck-root').getBoundingClientRect(); return { x: r.x + window.scrollX, y: r.y + window.scrollY, width: r.width, height: Math.min(r.height, window.innerHeight - Math.max(r.y, 0)) } })()")
  const { data } = await send('Page.captureScreenshot', { format: 'png', clip: { ...rect, scale: 1 }, captureBeyondViewport: false })
  writeFileSync(join(OUT, `${shot.name}.png`), Buffer.from(data, 'base64'))
  console.log('wrote', shot.name, Math.round(rect.width), 'x', Math.round(rect.height))
}
ws.close()
chrome.kill()
