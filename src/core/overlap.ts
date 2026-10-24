import type { DaySegment } from './events'
import { layoutDayEvents } from './layout'

/** A visible block: `column` and `span` are measured in `columns` (width = span / columns). */
export interface ColumnBlock extends DaySegment {
  column: number
  span: number
  columns: number
}

/** Events of one overlap cluster that did not fit: rendered as a single "+N" button. */
export interface MoreBlock {
  segments: DaySegment[]
  column: number
  columns: number
  start: Date
  end: Date
}

export interface ColumnLayout {
  blocks: ColumnBlock[]
  more: MoreBlock[]
}

const cache = new WeakMap<DaySegment[], Map<number, ColumnLayout>>()

const overlaps = (a: DaySegment, b: DaySegment) => a.start < b.end && b.start < a.end

/**
 * Lays out a day's segments for display: greedy columns per overlap cluster (see
 * `layoutDayEvents`), each block expands right while the next column is free during its time,
 * and when a cluster needs more than `maxColumns` columns the extra events collapse into one
 * "+N" block in the last column. Cached per (segments array, maxColumns).
 */
export function layoutColumns(segments: DaySegment[], maxColumns = Infinity): ColumnLayout {
  const max = Math.max(2, maxColumns)
  let byMax = cache.get(segments)
  if (!byMax) {
    byMax = new Map()
    cache.set(segments, byMax)
  }
  const cached = byMax.get(max)
  if (cached) return cached

  const positioned = layoutDayEvents(segments) // sorted by start, then longest first
  const result: ColumnLayout = { blocks: [], more: [] }
  let cluster: typeof positioned = []
  let clusterEnd = -Infinity

  const flush = () => {
    if (cluster.length === 0) return
    const columns = cluster[0].columns
    const capped = columns > max
    const shown = capped ? max - 1 : columns
    const hidden: DaySegment[] = []
    for (const placed of cluster) {
      if (placed.column >= shown) {
        hidden.push({ event: placed.event, start: placed.start, end: placed.end })
        continue
      }
      let span = 1
      for (let next = placed.column + 1; next < shown; next++) {
        if (cluster.some((other) => other.column === next && overlaps(other, placed))) break
        span++
      }
      result.blocks.push({ event: placed.event, start: placed.start, end: placed.end, column: placed.column, span, columns: capped ? max : columns })
    }
    if (hidden.length > 0) {
      result.more.push({
        segments: hidden,
        column: shown,
        columns: max,
        start: new Date(Math.min(...hidden.map((s) => s.start.getTime()))),
        end: new Date(Math.max(...hidden.map((s) => s.end.getTime()))),
      })
    }
    cluster = []
  }

  for (const placed of positioned) {
    const start = placed.start.getTime()
    if (start >= clusterEnd) {
      flush()
      clusterEnd = -Infinity
    }
    cluster.push(placed)
    clusterEnd = Math.max(clusterEnd, placed.end.getTime(), start + 1)
  }
  flush()

  byMax.set(max, result)
  return result
}
