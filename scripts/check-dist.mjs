// Fails the build when the published bundle would break consumers.
import { readFileSync, readdirSync } from 'node:fs'

const errors = []
for (const file of ['dist/index.js', 'dist/index.mjs']) {
  const head = readFileSync(file, 'utf8').slice(0, 20)
  if (!head.startsWith('"use client";')) {
    errors.push(`${file} must start with "use client"; (found ${JSON.stringify(head)})`)
  }
}
// calendarkit-pro/core is framework-agnostic: no "use client" banner, no React.
for (const file of ['dist/core.js', 'dist/core.mjs', 'dist/core.d.ts', 'dist/core.d.mts']) {
  let code
  try {
    code = readFileSync(file, 'utf8')
  } catch {
    errors.push(`${file} is missing (calendarkit-pro/core entry)`)
    continue
  }
  if (code.startsWith('"use client";')) errors.push(`${file} must not start with "use client"`)
  if (/from ['"]react['"]|require\(['"]react['"]\)/.test(code)) errors.push(`${file} must not import React`)
}
// calendarkit-pro/react: client-only, and it shares the engine with calendarkit-pro/core instead of
// bundling a second copy (one store implementation, one set of caches).
for (const file of ['dist/react.js', 'dist/react.mjs', 'dist/react.d.ts', 'dist/react.d.mts']) {
  let code
  try {
    code = readFileSync(file, 'utf8')
  } catch {
    errors.push(`${file} is missing (calendarkit-pro/react entry)`)
    continue
  }
  if (file.endsWith('.js') || file.endsWith('.mjs')) {
    if (!code.startsWith('"use client";')) errors.push(`${file} must start with "use client";`)
    if (!/['"]calendarkit-pro\/core['"]/.test(code)) errors.push(`${file} must import calendarkit-pro/core`)
    if (/function createCalendar\(/.test(code)) errors.push(`${file} must not bundle a copy of the engine`)
  }
}
const maps = readdirSync('dist').filter((name) => name.endsWith('.map'))
if (maps.length > 0) errors.push(`sourcemaps must not be published: ${maps.join(', ')}`)

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log('dist OK: "use client" banner on the React entries, framework-free core entry shared by them, no sourcemaps')
