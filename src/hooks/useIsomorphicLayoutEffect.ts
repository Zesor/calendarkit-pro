import { useEffect, useLayoutEffect } from 'react';

/** `useLayoutEffect` in the browser, `useEffect` on the server (React 18 warns on the former there). */
export const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
