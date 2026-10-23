import { RefObject, useEffect, useLayoutEffect, useState } from 'react';

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Spec §8.9: whether the element is narrower than `below` px (the phone layout). Measured before the
 * first paint and kept up to date; unmeasured (server, no layout) counts as wide.
 */
export function useCompact(ref: RefObject<HTMLElement | null>, below = 768): boolean {
  const [compact, setCompact] = useState(false);
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
