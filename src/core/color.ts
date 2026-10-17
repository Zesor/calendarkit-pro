// Hex (#rgb, #rgba, #rrggbb, #rrggbbaa), rgb()/rgba()/hsl()/hsla() with plain numeric arguments,
// or a CSS named colour. Anything else (quotes, semicolons, braces, url()…) is rejected.
const SAFE_COLOR = /^(#[0-9a-f]{3,4}|#[0-9a-f]{6}|#[0-9a-f]{8}|(rgb|rgba|hsl|hsla)\(\s*[\d.%\s,/+-]+\)|[a-z]+)$/i

/** Returns `value` when it is a plain CSS colour, otherwise `fallback` (U5: no CSS injection). */
export function safeColor(value: string | undefined, fallback: string): string {
  return value && SAFE_COLOR.test(value.trim()) ? value.trim() : fallback
}
