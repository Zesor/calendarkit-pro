export interface Box { left: number; top: number; right: number; bottom: number }

const GAP = 12;
const MARGIN = 8;

const clamp = (value: number, max: number) => Math.max(MARGIN, Math.min(value, max));

/**
 * Where a dialog of `size` goes beside `anchor` (both in viewport coordinates): right of it, else
 * left of it, top-aligned with it; a wide anchor with room on neither side gets it below, else
 * above. Always kept inside `area`; the result is relative to `area`'s corner.
 */
export function placeBeside(anchor: Box, size: { width: number; height: number }, area: Box): { left: number; top: number } {
  const width = area.right - area.left;
  const height = area.bottom - area.top;
  const a = { left: anchor.left - area.left, top: anchor.top - area.top, right: anchor.right - area.left, bottom: anchor.bottom - area.top };
  const top = clamp(a.top, height - size.height - MARGIN);
  if (a.right + GAP + size.width <= width - MARGIN) return { left: a.right + GAP, top };
  if (a.left - GAP - size.width >= MARGIN) return { left: a.left - GAP - size.width, top };
  const left = clamp(a.left, width - size.width - MARGIN);
  if (a.bottom + GAP + size.height <= height - MARGIN) return { left, top: a.bottom + GAP };
  if (a.top - GAP - size.height >= MARGIN) return { left, top: a.top - GAP - size.height };
  return { left, top };
}
