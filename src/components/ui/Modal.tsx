import React, { useEffect, useRef } from 'react';
import { X } from '../icons';
import { cx } from '../../utils';
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
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
      <div
        ref={overlayRef}
        className="absolute inset-0"
        onClick={onClose}
      />
      <div
        className={cx(
          "relative bg-background rounded-2xl shadow-2xl w-full flex flex-col max-h-[70vh] sm:max-h-[80vh] animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 border border-border/50",
          className
        )}
      >
        {!hideHeader && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 shrink-0 bg-gradient-to-r from-muted/20 to-background">
            <h3 className="text-lg font-semibold text-foreground">
              {title}
            </h3>
            <Button
              onClick={onClose}
              className="inline-flex text-sm font-medium hover:text-accent-foreground h-9 w-9 p-0 rounded-xl hover:bg-accent/80 transition-all duration-200"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">{closeLabel}</span>
            </Button>
          </div>
        )}
        <div className={cx("overflow-y-auto flex-1", !hideHeader && "p-6")}>
          {children}
        </div>
      </div>
    </div>
  );
};
