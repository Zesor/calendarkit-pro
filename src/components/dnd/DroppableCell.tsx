import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '../../utils';

interface DroppableCellProps {
  id: string; // usually ISO date string
  date: Date;
  resourceId?: string;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  /** Stable alternative to `onClick` for time slots: called with the cell's date and resource. */
  onSlotClick?: (date: Date, resourceId?: string) => void;
}

const QUARTER_HOVER = [
  "hover:bg-blue-50/50 dark:hover:bg-blue-900/10",
  "hover:bg-blue-50/80 dark:hover:bg-blue-900/20",
  "hover:bg-blue-100/50 dark:hover:bg-blue-900/30",
  "hover:bg-blue-100/80 dark:hover:bg-blue-900/40",
];

const QUARTER_ACTIVE = [
  "bg-blue-50/50 dark:bg-blue-900/10 ring-2 ring-primary ring-inset",
  "bg-blue-50/80 dark:bg-blue-900/20 ring-2 ring-primary ring-inset",
  "bg-blue-100/50 dark:bg-blue-900/30 ring-2 ring-primary ring-inset",
  "bg-blue-100/80 dark:bg-blue-900/40 ring-2 ring-primary ring-inset",
];

const quarterOf = (date: Date) => Math.min(3, Math.floor(date.getMinutes() / 15));

const DroppableCellImpl: React.FC<DroppableCellProps> = ({ id, date, resourceId, children, className, style, onClick, onSlotClick }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
    data: { date, resourceId },
  });

  const quarter = quarterOf(date);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        className,
        QUARTER_HOVER[quarter],
        isOver && QUARTER_ACTIVE[quarter],
        onSlotClick && "cursor-pointer"
      )}
      style={style}
      onClick={onSlotClick ? () => onSlotClick(date, resourceId) : onClick}
    >
      {children}
    </div>
  );
};

const shallowEqualStyle = (a?: React.CSSProperties, b?: React.CSSProperties) => {
  if (a === b) return true;
  if (!a || !b) return false;
  const keys = Object.keys(a) as (keyof React.CSSProperties)[];
  return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key]);
};

// C6: grid cells are numerous (672 in the week view); skip re-rendering them when nothing changed.
export const DroppableCell = React.memo(
  DroppableCellImpl,
  (prev, next) =>
    prev.id === next.id &&
    prev.date.getTime() === next.date.getTime() &&
    prev.resourceId === next.resourceId &&
    prev.children === next.children &&
    prev.className === next.className &&
    prev.onClick === next.onClick &&
    prev.onSlotClick === next.onSlotClick &&
    shallowEqualStyle(prev.style, next.style),
);
