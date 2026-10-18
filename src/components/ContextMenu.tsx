import React, { useState, useCallback, useEffect, useRef } from 'react';
import { CalendarEvent } from '../types';
import { cx } from '../utils';
import { Edit3, Trash2, Copy } from './icons';

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
      icon: <Edit3 className="ck:w-4 ck:h-4" />,
      onClick: () => {
        onEdit(event);
        onClose();
      },
    }] : []),
    ...(onDuplicate ? [{
      id: 'duplicate',
      label: translations?.duplicate || 'Duplicate',
      icon: <Copy className="ck:w-4 ck:h-4" />,
      onClick: () => {
        onDuplicate(event);
        onClose();
      },
    }] : []),
    ...customActions,
    ...(onDelete ? [{
      id: 'delete',
      label: translations?.delete || 'Delete',
      icon: <Trash2 className="ck:w-4 ck:h-4" />,
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
      <div
        ref={menuRef}
        className="ck:animate-pop-in ck:fixed ck:z-[100] ck:min-w-[180px] ck:bg-background ck:border-[0.5px] ck:border-border ck:rounded-xl ck:shadow-xl ck:overflow-hidden"
        style={{
          left: adjustedPosition.x,
          top: adjustedPosition.y,
        }}
      >
        {/* Event preview header */}
        <div className="ck:px-3 ck:py-2 ck:border-b-[0.5px] ck:border-border ck:bg-muted/30">
          <div className="ck:flex ck:items-center ck:gap-2">
            <div
              className="ck:w-2.5 ck:h-2.5 ck:rounded-full ck:shrink-0"
              style={{ backgroundColor: event.color || 'var(--ck-primary)' }}
            />
            <span className="ck:text-sm ck:font-medium ck:truncate ck:text-foreground">
              {event.title}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="ck:py-1">
          {actions.map((action, index) => (
            <React.Fragment key={action.id}>
              {index > 0 && action.variant === 'danger' && (
                <div className="ck:h-px ck:bg-border ck:my-1" />
              )}
              <button
                onClick={action.onClick}
                disabled={action.disabled}
                className={cx(
                  "ck:w-full ck:flex ck:items-center ck:gap-3 ck:px-3 ck:py-2 ck:text-sm ck:transition-colors",
                  action.disabled && "ck:opacity-50 ck:cursor-not-allowed",
                  action.variant === 'danger'
                    ? "ck:text-red-600 ck:hover:bg-red-50 ck:dark:text-red-400 ck:dark:hover:bg-red-900/20"
                    : "ck:text-foreground ck:hover:bg-accent"
                )}
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>
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
