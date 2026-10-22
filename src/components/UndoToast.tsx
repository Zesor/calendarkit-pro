import React, { useEffect, useState } from 'react';
import type { LastChange } from '../core/store';
import { CalendarTranslations } from '../types';
import { interpolate } from '../core/format';

interface UndoToastProps {
  change: LastChange | null;
  onUndo: () => void;
  translations: CalendarTranslations;
}

/** Spec §8.6: after each change, a toast at the bottom of the window says what happened and offers Undo for 6 seconds. */
export const UndoToast: React.FC<UndoToastProps> = ({ change, onUndo, translations: t }) => {
  const [shown, setShown] = useState<LastChange | null>(null);
  useEffect(() => {
    setShown(change);
    if (!change) return;
    const timer = setTimeout(() => setShown(null), 6000);
    return () => clearTimeout(timer);
  }, [change]);

  const messages: Record<LastChange['kind'], string> = {
    create: t.changeCreate,
    update: t.changeUpdate,
    move: t.changeMove,
    resize: t.changeResize,
    duplicate: t.changeDuplicate,
    delete: t.changeDelete,
  };
  return (
    <div role="status" aria-live="polite" className="ck:fixed ck:bottom-6 ck:left-1/2 ck:-translate-x-1/2 ck:z-50">
      {shown && (
        <div className="ck:flex ck:items-center ck:gap-3 ck:rounded-xl ck:bg-foreground ck:py-2 ck:pl-4 ck:pr-2 ck:text-sm ck:text-background ck:shadow-xl ck:animate-rise-in">
          <span>{interpolate(messages[shown.kind], { title: shown.title })}</span>
          <button type="button" className="ck:rounded-lg ck:bg-background/15 ck:px-3 ck:py-1.5 ck:font-bold ck:hover:bg-background/25" onClick={onUndo}>
            {t.undo}
          </button>
        </div>
      )}
    </div>
  );
};
