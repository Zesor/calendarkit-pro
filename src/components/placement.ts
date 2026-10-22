export interface Box { left: number; top: number; right: number; bottom: number }

const GAP = 12;
const MARGIN = 8;

/**
 * Where a dialog of `size` goes beside `anchor` (both in viewport coordinates): right of it, else
 * left of it, top-aligned with it, kept inside `area`. The result is relative to `area`'s corner.
 */
export function placeBeside(anchor: Box, size: { width: number; height: number }, area: Box): { left: number; top: number } {
  const width = area.right - area.left;
  const height = area.bottom - area.top;
  let left = anchor.right - area.left + GAP;
  if (left + size.width > width - MARGIN) left = anchor.left - area.left - size.width - GAP;
  if (left < MARGIN) left = MARGIN;
  const top = Math.max(MARGIN, Math.min(anchor.top - area.top, height - size.height - MARGIN));
  return { left, top };
}
