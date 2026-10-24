// Classes are joined, never merged (no tailwind-merge at runtime): no element may carry two classes
// for the same CSS property, or the stylesheet order would pick the winner instead of the author.
import { cleanup } from '@testing-library/react'
import { twMerge } from 'tailwind-merge'
import { afterEach, describe, expect, test } from 'vitest'
import { classLists, SCHEDULER_STATES } from '../../test/states'
import { cx } from '../../utils'

afterEach(cleanup)

describe('cx', () => {
  test('joins the truthy class names in order', () => {
    expect(cx('a', false, 'b', null, undefined, '', 'c')).toBe('a b c')
    expect(cx()).toBe('')
  })
})

describe('rendered classes', () => {
  test.each(SCHEDULER_STATES)('%s: no element has two classes for the same property', (_label, show) => {
    show()
    const conflicts = classLists().flatMap((list) => {
      const tokens = [...new Set(list.split(/\s+/))]
      const kept = new Set(twMerge(tokens.join(' ')).split(' '))
      const dropped = tokens.filter((t) => !kept.has(t))
      return dropped.length ? [`${dropped.join(' ')}  ⟵  ${list}`] : []
    })
    expect(conflicts).toEqual([])
  })
})
