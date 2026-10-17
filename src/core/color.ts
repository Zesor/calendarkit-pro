// Any colour syntax (hex, named, rgb/hsl/oklch/lab…, var(--x), color-mix…) made only of letters,
// digits, spaces and `# % . , / ( ) + - _`. Quotes, semicolons, braces, colons, backslashes, angle
// brackets, url() and expression() are rejected, so the value can never leave its declaration.
const SAFE_COLOR = /^[#\w\s%.,/()+-]+$/
const FORBIDDEN = /url\(|expression\(/i

/** Returns `value` when it is a plain CSS colour, otherwise `fallback` (U5: no CSS injection). */
export function safeColor(value: string | undefined, fallback: string): string {
  return value && SAFE_COLOR.test(value.trim()) && !FORBIDDEN.test(value) ? value.trim() : fallback
}
