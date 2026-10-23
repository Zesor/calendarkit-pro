import React, { useEffect, useRef } from 'react';
import { useDialogFocus } from './useDialogFocus';
import { X } from './icons';

/** Spec §8.9: the side panel on a phone, over the calendar on a light scrim (nothing blurred). */
export const Drawer: React.FC<{ label: string; closeLabel: string; onClose: () => void; children: React.ReactNode }> = ({ label, closeLabel, onClose, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="ck:absolute ck:inset-0 ck:z-40">
      <div data-ck-drawer-scrim className="ck:absolute ck:inset-0 ck:bg-black/20 ck:animate-fade-in" onClick={onClose} />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} className="ck:absolute ck:inset-y-0 ck:left-0 ck:flex ck:w-[min(300px,85%)] ck:flex-col ck:bg-background ck:shadow-xl ck:outline-none ck:animate-fade-in">
        {/* A screen reader on a phone cannot reach the scrim. */}
        <div className="ck:flex ck:shrink-0 ck:justify-end ck:px-2 ck:pt-2">
          <button type="button" onClick={onClose} aria-label={closeLabel} className="ck:flex ck:min-h-11 ck:min-w-11 ck:items-center ck:justify-center ck:rounded-full ck:text-muted-foreground ck:hover:bg-muted">
            <X className="ck:h-5 ck:w-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
