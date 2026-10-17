const warned = new Set<string>()

/** Logs a development warning once per key; silent in production builds. */
export function warnOnce(key: string, message: string): void {
  if (process.env.NODE_ENV === 'production' || warned.has(key)) return
  warned.add(key)
  console.warn(`[calendarkit-pro] ${message}`)
}

/** Test helper: forget which warnings were already printed. */
export function resetWarnings(): void {
  warned.clear()
}
