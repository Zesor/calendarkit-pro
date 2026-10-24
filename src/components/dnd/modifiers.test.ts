import type { ClientRect } from '@dnd-kit/core'
import { describe, expect, test } from 'vitest'
import { restrictToWindowEdges, snapToGrid } from './modifiers'

const rect = (left: number, top: number, width: number, height: number): ClientRect => ({ left, top, width, height, right: left + width, bottom: top + height })
const args = (x: number, y: number, extra: object = {}) =>
  ({ transform: { x, y, scaleX: 1, scaleY: 1 }, ...extra }) as unknown as Parameters<typeof restrictToWindowEdges>[0]

describe('drag modifiers', () => {
  test('snapToGrid rounds the offset up to the grid', () => {
    expect(snapToGrid(15)(args(16, -16))).toMatchObject({ x: 30, y: -15 })
    expect(snapToGrid(15)(args(30, 0))).toMatchObject({ x: 30, y: 0 })
  })

  test('restrictToWindowEdges keeps the ghost inside the window', () => {
    const extra = { draggingNodeRect: rect(100, 100, 50, 40), windowRect: rect(0, 0, 400, 300) }
    expect(restrictToWindowEdges(args(-500, 500, extra))).toMatchObject({ x: -100, y: 160 })
    expect(restrictToWindowEdges(args(10, 20, extra))).toMatchObject({ x: 10, y: 20 })
    expect(restrictToWindowEdges(args(10, 20))).toMatchObject({ x: 10, y: 20 })
  })
})
