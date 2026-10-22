import type { CalendarProps } from '../types';

/** The hours and slots of the week, day and resource grids, from the Scheduler's props. */
export interface TimeGrid {
  startHour: number;
  endHour: number;
  slotMinutes: number;
  /** Latest hours on top (issue #2): positions count from the bottom edge. */
  reverse: boolean;
}

export const DEFAULT_GRID: TimeGrid = { startHour: 0, endHour: 24, slotMinutes: 15, reverse: false };

// Slots tile the hour exactly, so every hour row holds the same cells.
const SLOT_LENGTHS = [5, 10, 15, 20, 30, 60];

/** Whole hours inside the day, at least one hour shown; slots that divide an hour, 15 minutes otherwise. */
export function resolveTimeGrid({ dayStartHour, dayEndHour, slotDuration = 15, reverseTimeAxis = false }: Pick<CalendarProps, 'dayStartHour' | 'dayEndHour' | 'slotDuration' | 'reverseTimeAxis'>): TimeGrid {
  const startHour = Math.min(Math.max(Math.floor(dayStartHour ?? 0) || 0, 0), 23);
  const endHour = Math.min(Math.max(Math.ceil(dayEndHour ?? 24) || 24, startHour + 1), 24);
  return { startHour, endHour, slotMinutes: SLOT_LENGTHS.includes(slotDuration) ? slotDuration : 15, reverse: reverseTimeAxis };
}

/** Minutes of each slot's start within an hour. */
export const gridSlots = (grid: TimeGrid) => Array.from({ length: 60 / grid.slotMinutes }, (_, i) => i * grid.slotMinutes);

/** The hours drawn, in order. */
export const gridHours = (grid: TimeGrid) => Array.from({ length: grid.endHour - grid.startHour }, (_, i) => grid.startHour + i);

/**
 * Position of `minutes` after midnight on a grid of `hourHeight` px per hour: from the top edge, or
 * from the bottom edge on a reversed grid (a block anchored there grows upward, toward its end).
 */
export const gridOffset = (grid: TimeGrid, minutes: number, hourHeight: number) =>
  ({ [grid.reverse ? 'bottom' : 'top']: `${((minutes - grid.startHour * 60) / 60) * hourHeight}px` });

/** Scroll position on open: `offsetHours` of the past above the current hour (below it on a reversed grid). */
export function gridScrollTop(grid: TimeGrid, nowHour: number, offsetHours: number, hourHeight: number) {
  const top = grid.reverse ? grid.endHour - (nowHour + offsetHours) : nowHour - offsetHours - grid.startHour;
  return Math.max(0, top * hourHeight);
}

/** A wall-clock date `minutes` after the day's midnight. */
export const slotDate = (day: Date, minutes: number) => {
  const date = new Date(day);
  date.setHours(0, minutes, 0, 0);
  return date;
};
