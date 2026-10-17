// Fails the build when the published bundle would break consumers.
import { readFileSync, readdirSync } from 'node:fs'

const errors = []
for (const file of ['dist/index.js', 'dist/index.mjs']) {
  const head = readFileSync(file, 'utf8').slice(0, 20)
  if (!head.startsWith('"use client";')) {
    errors.push(`${file} must start with "use client"; (found ${JSON.stringify(head)})`)
  }
}
const maps = readdirSync('dist').filter((name) => name.endsWith('.map'))
if (maps.length > 0) errors.push(`sourcemaps must not be published: ${maps.join(', ')}`)

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log('dist OK: "use client" banner present, no sourcemaps')
