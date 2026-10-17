import React, { useState, useCallback, useEffect, useRef } from 'react';
import { CalendarEvent } from '../types';
import { cn } from '../utils';
import { Edit3, Trash2, Copy } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface ContextMenuAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

interface EventContextMenuProps {
  event: CalendarEvent | null;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onEdit?: (event: CalendarEvent) => void;
  onDelete?: (eventId: string) => void;
  onDuplicate?: (event: CalendarEvent) => void;
  customActions?: ContextMenuAction[];
  translations?: {
    edit?: string;
    delete?: string;
    duplicate?: string;
  };
}

export const EventContextMenu: React.FC<EventContextMenuProps> = ({
  event,
  position,
  onClose,
  onEdit,
  onDelete,
  onDuplicate,
  customActions = [],
  translations,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (position) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [position, onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (position) {
      // Delay to prevent immediate close from the right-click that opened it
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [position, onClose]);

  if (!event || !position) return null;

  const actions: ContextMenuAction[] = [
    ...(onEdit ? [{
      id: 'edit',
      label: translations?.edit || 'Edit',
      icon: <Edit3 className="w-4 h-4" />,
      onClick: () => {
        onEdit(event);
        onClose();
      },
    }] : []),
    ...(onDuplicate ? [{
      id: 'duplicate',
      label: translations?.duplicate || 'Duplicate',
      icon: <Copy className="w-4 h-4" />,
      onClick: () => {
        onDuplicate(event);
        onClose();
      },
    }] : []),
    ...customActions,
    ...(onDelete ? [{
      id: 'delete',
      label: translations?.delete || 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: () => {
        onDelete(event.id);
        onClose();
      },
      variant: 'danger' as const,
    }] : []),
  ];

  // Calculate position to ensure menu stays within viewport
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 200),
    y: Math.min(position.y, window.innerHeight - (actions.length * 44 + 80)),
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95, y: -5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -5 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="fixed z-[100] min-w-[180px] bg-background border-[0.5px] border-border rounded-xl shadow-xl overflow-hidden"
        style={{
          left: adjustedPosition.x,
          top: adjustedPosition.y,
        }}
      >
        {/* Event preview header */}
        <div className="px-3 py-2 border-b-[0.5px] border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: event.color || 'var(--primary)' }}
            />
            <span className="text-sm font-medium truncate text-foreground">
              {event.title}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="py-1">
          {actions.map((action, index) => (
            <React.Fragment key={action.id}>
              {index > 0 && action.variant === 'danger' && (
                <div className="h-px bg-border my-1" />
              )}
              <button
                onClick={action.onClick}
                disabled={action.disabled}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors",
                  action.disabled && "opacity-50 cursor-not-allowed",
                  action.variant === 'danger'
                    ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    : "text-foreground hover:bg-accent"
                )}
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            </React.Fragment>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Hook to manage context menu state
export const useEventContextMenu = () => {
  const [contextMenu, setContextMenu] = useState<{
    event: CalendarEvent | null;
    position: { x: number; y: number } | null;
  }>({ event: null, position: null });

  const openContextMenu = useCallback((event: CalendarEvent, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      event,
      position: { x: e.clientX, y: e.clientY },
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu({ event: null, position: null });
  }, []);

  return {
    contextMenuEvent: contextMenu.event,
    contextMenuPosition: contextMenu.position,
    openContextMenu,
    closeContextMenu,
  };
};
