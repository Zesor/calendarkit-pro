import { RefObject, useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';
// Each open dialog's origin: a dialog opened from inside another (Edit in the event card) gives the
// focus back to where the first one came from, its own origin being gone by then.
const origins = new WeakMap<Element, HTMLElement>();

/**
 * Spec §8.8: the focus moves into the dialog, Tab stays inside it (`trap`), and on close it goes back
 * to the element the dialog was opened from, unless the user has already put it somewhere else. A new
 * `content` while open (the Focus panel switching events) brings the focus back in.
 */
export function useDialogFocus(ref: RefObject<HTMLElement | null>, { open = true, trap = true, content }: { open?: boolean; trap?: boolean; content?: unknown } = {}) {
  const origin = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  // Read while rendering: autoFocus moves the focus during the commit, before any effect runs.
  if (open && !wasOpen.current && typeof document !== 'undefined') {
    const active = document.activeElement as HTMLElement | null;
    const host = active?.closest('[role="dialog"]');
    origin.current = (host && origins.get(host)) || active;
  }
  wasOpen.current = open;

  useEffect(() => {
    const node = ref.current;
    if (!open || !node) return;
    const from = origin.current;
    if (from) origins.set(node, from);
    if (!node.contains(document.activeElement)) (node.querySelector<HTMLElement>(FOCUSABLE) ?? node).focus();
    const onKey = (e: KeyboardEvent) => {
      if (!trap || e.key !== 'Tab') return;
      const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => !el.closest('[hidden]'));
      const edge = e.shiftKey ? items[0] : items[items.length - 1];
      // The card itself (focused on open) counts as an edge both ways.
      const active = document.activeElement;
      if (edge && (active === edge || active === node || !node.contains(active))) {
        e.preventDefault();
        (e.shiftKey ? items[items.length - 1] : items[0]).focus();
      }
    };
    node.addEventListener('keydown', onKey);
    return () => {
      node.removeEventListener('keydown', onKey);
      // Closed with the focus inside (gone with it, so on the body): back to the origin if it is still there.
      // Next frame: closed by Enter, the same key press would otherwise go on and click the origin.
      requestAnimationFrame(() => {
        const active = document.activeElement;
        if ((!active || active === document.body) && from?.isConnected && from !== document.body) from.focus();
      });
    };
  }, [open, trap, ref, content]);
}
