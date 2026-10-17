const warned = new Set<string>()

// Bundlers replace `process.env.NODE_ENV` statically; without a bundler `process` may not exist.
function isProductionBuild(): boolean {
  try {
    return process.env.NODE_ENV === 'production'
  } catch {
    return false
  }
}

/** Logs a development warning once per key; silent in production builds. */
export function warnOnce(key: string, message: string): void {
  if (isProductionBuild() || warned.has(key)) return
  warned.add(key)
  console.warn(`[calendarkit-pro] ${message}`)
}

/** Test helper: forget which warnings were already printed. */
export function resetWarnings(): void {
  warned.clear()
}
