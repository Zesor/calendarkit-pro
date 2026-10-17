import { useRef, useCallback, useEffect } from 'react';

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number; // Minimum distance to trigger swipe
  restraint?: number; // Maximum perpendicular distance
  allowedTime?: number; // Maximum time allowed to complete swipe
  enabled?: boolean;
}

interface TouchInfo {
  startX: number;
  startY: number;
  startTime: number;
}

const useSwipeGesture = <T extends HTMLElement>(
  options: SwipeGestureOptions
) => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 100,
    restraint = 100,
    allowedTime = 500,
    enabled = true,
  } = options;

  const touchInfoRef = useRef<TouchInfo | null>(null);
  const elementRef = useRef<T>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;

    const touch = e.touches[0];
    touchInfoRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
    };
  }, [enabled]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!enabled || !touchInfoRef.current) return;

    const touch = e.changedTouches[0];
    const { startX, startY, startTime } = touchInfoRef.current;

    const distX = touch.clientX - startX;
    const distY = touch.clientY - startY;
    const elapsedTime = Date.now() - startTime;

    // Check if swipe was fast enough
    if (elapsedTime <= allowedTime) {
      // Horizontal swipe
      if (Math.abs(distX) >= threshold && Math.abs(distY) <= restraint) {
        if (distX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      }
      // Vertical swipe
      else if (Math.abs(distY) >= threshold && Math.abs(distX) <= restraint) {
        if (distY > 0) {
          onSwipeDown?.();
        } else {
          onSwipeUp?.();
        }
      }
    }

    touchInfoRef.current = null;
  }, [enabled, threshold, restraint, allowedTime, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  return elementRef;
};

// Higher-order component for adding swipe to views
export const useViewSwipe = <T extends HTMLElement = HTMLElement>(
  onPrev: () => void,
  onNext: () => void,
  enabled: boolean = true
) => {
  return useSwipeGesture<T>({
    onSwipeLeft: onNext,
    onSwipeRight: onPrev,
    threshold: 50,
    restraint: 100,
    allowedTime: 300,
    enabled,
  });
};
