import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cx } from '../../utils';

interface DroppableCellProps {
  id: string; // usually ISO date string
  date: Date;
  resourceId?: string;
  /** Marks the day cells of the all-day row (drops there keep events on the day level). */
  allDayRow?: boolean;
  children?: React.ReactNode;
  className?: string;
  /** Background and ring of the cell when no drag is over it (the drop highlight replaces them). */
  idleClassName?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  /** Stable alternative to `onClick` for time slots: called with the cell's date and resource. */
  onSlotClick?: (date: Date, resourceId?: string) => void;
}

const QUARTER_HOVER = [
  "ck:hover:bg-blue-50/50 ck:dark:hover:bg-blue-900/10",
  "ck:hover:bg-blue-50/80 ck:dark:hover:bg-blue-900/20",
  "ck:hover:bg-blue-100/50 ck:dark:hover:bg-blue-900/30",
  "ck:hover:bg-blue-100/80 ck:dark:hover:bg-blue-900/40",
];

const QUARTER_ACTIVE = [
  "ck:bg-blue-50/50 ck:dark:bg-blue-900/10 ck:ring-2 ck:ring-primary ck:ring-inset",
  "ck:bg-blue-50/80 ck:dark:bg-blue-900/20 ck:ring-2 ck:ring-primary ck:ring-inset",
  "ck:bg-blue-100/50 ck:dark:bg-blue-900/30 ck:ring-2 ck:ring-primary ck:ring-inset",
  "ck:bg-blue-100/80 ck:dark:bg-blue-900/40 ck:ring-2 ck:ring-primary ck:ring-inset",
];

const quarterOf = (date: Date) => Math.min(3, Math.floor(date.getMinutes() / 15));

/** A cell's classes: while a drag is over it, the drop highlight replaces its idle background and ring. */
export function droppableCellClasses({ className, idleClassName, date, isOver, clickable }: {
  className?: string;
  idleClassName?: string;
  date: Date;
  isOver: boolean;
  clickable?: boolean;
}) {
  const quarter = quarterOf(date);
  return cx(className, !isOver && idleClassName, QUARTER_HOVER[quarter], isOver && QUARTER_ACTIVE[quarter], clickable && "ck:cursor-pointer");
}

const DroppableCellImpl: React.FC<DroppableCellProps> = ({ id, date, resourceId, allDayRow, children, className, idleClassName, style, onClick, onSlotClick }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
    data: { date, resourceId, allDayRow },
  });

  return (
    <div
      ref={setNodeRef}
      className={droppableCellClasses({ className, idleClassName, date, isOver, clickable: !!onSlotClick })}
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
    prev.allDayRow === next.allDayRow &&
    prev.children === next.children &&
    prev.className === next.className &&
    prev.idleClassName === next.idleClassName &&
    prev.onClick === next.onClick &&
    prev.onSlotClick === next.onSlotClick &&
    shallowEqualStyle(prev.style, next.style),
);
