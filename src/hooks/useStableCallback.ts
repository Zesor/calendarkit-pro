import { useCallback, useRef } from 'react';

/**
 * Returns a callback with a stable identity that always runs the latest `fn`. Lets memoized
 * children (grid cells, event blocks) skip re-rendering when consumers pass inline callbacks.
 */
export function useStableCallback<Args extends unknown[], Result>(fn: (...args: Args) => Result): (...args: Args) => Result {
  const ref = useRef(fn);
  ref.current = fn;
  return useCallback((...args: Args) => ref.current(...args), []);
}
