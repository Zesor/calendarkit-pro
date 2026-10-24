import { RefObject, useState } from 'react';
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect';

/**
 * Spec §8.9: whether the element is narrower than `below` px (the phone layout). Measured before the
 * first paint and kept up to date; `null` until measured (server render, no layout), when the
 * caller falls back to the window's media queries.
 */
export function useCompact(ref: RefObject<HTMLElement | null>, below = 768): boolean | null {
  const [compact, setCompact] = useState<boolean | null>(null);
  useIsomorphicLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = (width: number) => width > 0 && setCompact(width < below);
    update(element.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => update(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, below]);
  return compact;
}
