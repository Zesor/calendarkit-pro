import { afterEach, expect, test, vi } from 'vitest'
import { resetWarnings, warnOnce } from './warn'

afterEach(() => {
  vi.unstubAllGlobals()
  resetWarnings()
})

test('warnOnce does not throw when `process` is not defined (bundler-less ESM)', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.stubGlobal('process', undefined)
  expect(() => warnOnce('no-process', 'message')).not.toThrow()
  vi.unstubAllGlobals()
  expect(warn).toHaveBeenCalledTimes(1)
})
