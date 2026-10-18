import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { resetWarnings } from './core/warn'
import { cn, Scheduler } from './index'

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  resetWarnings()
})

test('the deprecated root `cn` still merges classes', () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  expect(cn('px-2 py-1', null, undefined, ['text-sm'], { 'px-4': true })).toBe('py-1 text-sm px-4')
})

test('the deprecated root `cn` warns once in development', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  cn('a')
  cn('b')
  expect(warn).toHaveBeenCalledTimes(1)
  expect(warn.mock.calls[0][0]).toMatch(/`cn` is deprecated.*2\.0/)
})

test('the deprecated root `cn` is silent in production', () => {
  vi.stubEnv('NODE_ENV', 'production')
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  expect(cn('a', 'b')).toBe('a b')
  expect(warn).not.toHaveBeenCalled()
})

test('rendering the Scheduler does not trigger the `cn` deprecation warning', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  render(<Scheduler events={[]} view="month" date={new Date(2026, 9, 15)} />)
  expect(warn.mock.calls.some(([message]) => String(message).includes('`cn`'))).toBe(false)
})
