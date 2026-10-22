import React, { useEffect, useRef } from 'react';
import { X } from '../icons';
import { cx } from '../../utils';
import { useClassNames } from '../customize';
import { Button } from './button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  hideHeader?: boolean;
  /** Screen-reader label of the header close button. */
  closeLabel?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  hideHeader = false,
  closeLabel = 'Close',
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const classNames = useClassNames();

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
      <div
        className={cx(
          "ck:relative ck:bg-background ck:rounded-2xl ck:shadow-2xl ck:w-full ck:flex ck:flex-col ck:max-h-[70vh] ck:sm:max-h-[80vh] ck:duration-300 ck:border ck:border-border/50",
          className,
          classNames.dialog
        )}
      >
        {!hideHeader && (
          <div className="ck:flex ck:items-center ck:justify-between ck:px-6 ck:py-4 ck:border-b ck:border-border/50 ck:shrink-0 ck:bg-linear-to-r ck:from-muted/20 ck:to-background">
            <h3 className="ck:text-lg ck:font-semibold ck:text-foreground">
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
        <div className={cx("ck:overflow-y-auto ck:flex-1", !hideHeader && "ck:p-6")}>
          {children}
        </div>
      </div>
    </div>
  );
};
