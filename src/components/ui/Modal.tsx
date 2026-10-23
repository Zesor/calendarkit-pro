import React, { useEffect, useId, useRef } from 'react';
import { X } from '../icons';
import { cx } from '../../utils';
import { useClassNames } from '../customize';
import { Button } from './button';
import { useDialogFocus } from '../useDialogFocus';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  hideHeader?: boolean;
  /** Screen-reader label of the header close button. */
  closeLabel?: string;
  /** Id of the heading that names the dialog, when it draws its own header (`hideHeader`). */
  labelledBy?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  hideHeader = false,
  closeLabel = 'Close',
  labelledBy,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  // A calendar taller than the window: bring the whole dialog into view (it fits: see max-h below).
  useEffect(() => {
    if (isOpen) panelRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [isOpen]);
  const classNames = useClassNames();
  useDialogFocus(panelRef, { open: isOpen });

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Render inside parent container (absolute positioning) instead of portal to document.body
  return (
    <div className="ck:absolute ck:inset-0 ck:z-50 ck:flex ck:items-center ck:justify-center ck:p-4 ck:bg-black/40 ck:backdrop-blur-md ck:duration-300">
      <div
        ref={overlayRef}
        className="ck:absolute ck:inset-0"
        onClick={onClose}
      />
      {/* No taller than the calendar nor the window: the footer stays in view. */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={hideHeader ? labelledBy : titleId}
        className={cx(
          "ck:relative ck:bg-background ck:rounded-2xl ck:shadow-2xl ck:w-full ck:flex ck:flex-col ck:max-h-[min(100%,calc(100dvh-2rem))] ck:duration-300 ck:border ck:border-border/50",
          className,
          classNames.dialog
        )}
      >
        {!hideHeader && (
          <div className="ck:flex ck:items-center ck:justify-between ck:px-6 ck:py-4 ck:border-b ck:border-border/50 ck:shrink-0 ck:bg-linear-to-r ck:from-muted/20 ck:to-background">
            <h3 id={titleId} className="ck:text-lg ck:font-semibold ck:text-foreground">
              {title}
            </h3>
            <Button
              onClick={onClose}
              className="ck:inline-flex ck:text-sm ck:font-medium ck:hover:text-accent-foreground ck:h-9 ck:w-9 ck:p-0 ck:rounded-xl ck:hover:bg-accent/80 ck:transition-all ck:duration-200"
            >
              <X className="ck:h-4 ck:w-4" />
              <span className="ck:sr-only">{closeLabel}</span>
            </Button>
          </div>
        )}
        <div className={cx("ck:flex-1 ck:min-h-0", hideHeader ? "ck:flex ck:flex-col" : "ck:overflow-y-auto ck:p-6")}>
          {children}
        </div>
      </div>
    </div>
  );
};
