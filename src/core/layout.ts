import type { DaySegment } from './events'

export interface PositionedSegment extends DaySegment {
  /** 0-based column inside its overlap cluster. */
  column: number
  /** Number of columns in the cluster: width is 1 / columns. */
  columns: number
}

const layoutCache = new WeakMap<DaySegment[], PositionedSegment[]>()

/**
 * Places a day's segments in columns (T5): segments that overlap — even transitively — form a
 * cluster; each segment takes the first column free at its start. O(n log n). Cached per input
 * array (C3), which `segmentsByDisplayDay` keeps stable.
 */
export function layoutDayEvents(segments: DaySegment[]): PositionedSegment[] {
  const cached = layoutCache.get(segments)
  if (cached) return cached

  const sorted = [...segments].sort(
    (a, b) =>
      a.start.getTime() - b.start.getTime() ||
      b.end.getTime() - a.end.getTime() ||
      (a.event.id < b.event.id ? -1 : a.event.id > b.event.id ? 1 : 0),
  )

  const result: PositionedSegment[] = []
  let cluster: PositionedSegment[] = []
  let columnEnds: number[] = []
  let clusterEnd = -Infinity

  const closeCluster = () => {
    for (const placed of cluster) placed.columns = columnEnds.length
    cluster = []
    columnEnds = []
  }

  for (const segment of sorted) {
    const start = segment.start.getTime()
    const end = Math.max(segment.end.getTime(), start + 1)
    if (start >= clusterEnd) closeCluster()
    let column = columnEnds.findIndex((columnEnd) => columnEnd <= start)
    if (column === -1) {
      column = columnEnds.length
      columnEnds.push(end)
    } else {
      columnEnds[column] = end
    }
    const placed: PositionedSegment = { ...segment, column, columns: 1 }
    cluster.push(placed)
    result.push(placed)
    clusterEnd = Math.max(clusterEnd, end)
  }
  closeCluster()

  layoutCache.set(segments, result)
  return result
}
