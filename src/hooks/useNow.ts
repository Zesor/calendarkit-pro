import { useEffect, useState } from 'react';

/**
 * The current time, moving every minute; `null` until mounted, so the server's HTML and the first
 * client render agree (neither shows "now": the clock may have moved, or the server's zone differ).
 */
export function useNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
