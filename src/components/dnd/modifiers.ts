import type { Modifier } from '@dnd-kit/core';

/** Snaps the drag ghost to a `size` px grid (rounds up, like @dnd-kit/modifiers' createSnapModifier). */
export const snapToGrid = (size: number): Modifier => ({ transform }) => ({
  ...transform,
  x: Math.ceil(transform.x / size) * size,
  y: Math.ceil(transform.y / size) * size,
});

/** Keeps the drag ghost inside the window. */
export const restrictToWindowEdges: Modifier = ({ transform, draggingNodeRect: rect, windowRect: bounds }) => {
  if (!rect || !bounds) return transform;
  const value = { ...transform };
  if (rect.top + transform.y <= bounds.top) value.y = bounds.top - rect.top;
  else if (rect.bottom + transform.y >= bounds.top + bounds.height) value.y = bounds.top + bounds.height - rect.bottom;
  if (rect.left + transform.x <= bounds.left) value.x = bounds.left - rect.left;
  else if (rect.right + transform.x >= bounds.left + bounds.width) value.x = bounds.left + bounds.width - rect.right;
  return value;
};
