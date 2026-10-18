import React from 'react';
import { cx } from '../utils';

// Base skeleton block: callers set its size and rounding.
const Skeleton: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <div className={cx("animate-pulse bg-muted/40", className)} style={style} />
);

// Month View Skeleton
export const MonthViewSkeleton: React.FC = () => (
  <div className="h-full bg-background border border-border/50 rounded-2xl overflow-hidden">
    {/* Header */}
    <div className="grid grid-cols-7 border-b border-border/50 bg-muted/10">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="py-3 px-2 text-center border-r border-border/30 last:border-r-0">
          <Skeleton className="h-4 w-8 mx-auto rounded" />
        </div>
      ))}
    </div>
    {/* Grid */}
    <div className="grid grid-cols-7 flex-1">
      {Array.from({ length: 35 }).map((_, i) => (
        <div key={i} className="min-h-[120px] border-r border-b border-border/30 p-2">
          <Skeleton className="h-4 w-6 mb-2 rounded" />
          <div className="space-y-1">
            {/* Deterministic pattern: Math.random() broke SSR hydration. */}
            {(i * 7) % 10 > 4 && <Skeleton className="h-5 w-full rounded-md" />}
            {(i * 3) % 10 > 6 && <Skeleton className="h-5 w-3/4 rounded-md" />}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Week View Skeleton
export const WeekViewSkeleton: React.FC = () => (
  <div className="h-full bg-background border border-border/50 rounded-2xl overflow-hidden">
    {/* Header */}
    <div className="flex border-b border-border/50 bg-muted/10">
      <div className="w-16 p-3 border-r border-border/30">
        <Skeleton className="h-8 w-10 mx-auto rounded" />
      </div>
      <div className="flex-1 grid grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="py-3 px-2 text-center border-r border-border/30 last:border-r-0">
            <Skeleton className="h-3 w-8 mx-auto mb-1 rounded" />
            <Skeleton className="h-8 w-8 mx-auto rounded-xl" />
          </div>
        ))}
      </div>
    </div>
    {/* Grid */}
    <div className="flex flex-1" style={{ height: '600px' }}>
      <div className="w-16 border-r border-border/30">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-[60px] relative">
            <Skeleton className="h-4 w-10 absolute right-2 -translate-y-1/2 rounded" />
          </div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-7 relative">
        {Array.from({ length: 7 }).map((_, colIdx) => (
          <div key={colIdx} className="relative border-r border-border/30 last:border-r-0">
            {Array.from({ length: 10 }).map((_, rowIdx) => (
              <div key={rowIdx} className="h-[60px] border-b border-dashed border-border/20" />
            ))}
            {/* Random events */}
            {Math.random() > 0.3 && (
              <Skeleton
                className="absolute rounded-md"
                style={{
                  top: `${Math.floor(Math.random() * 400)}px`,
                  left: '4px',
                  right: '4px',
                  height: `${60 + Math.floor(Math.random() * 120)}px`
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Day View Skeleton
export const DayViewSkeleton: React.FC = () => (
  <div className="h-full bg-background border border-border/50 rounded-2xl overflow-hidden">
    {/* Header */}
    <div className="px-6 py-4 border-b border-border/50 bg-muted/10 text-center">
      <Skeleton className="h-7 w-64 mx-auto rounded" />
    </div>
    {/* Grid */}
    <div className="flex flex-1" style={{ height: '600px' }}>
      <div className="w-20 border-r border-border/30 bg-muted/5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-[80px] relative">
            <Skeleton className="h-4 w-12 absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded" />
          </div>
        ))}
      </div>
      <div className="flex-1 relative">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-[80px] border-b border-dashed border-border/20" />
        ))}
        {/* Random events */}
        <Skeleton
          className="absolute rounded-lg left-4 right-4"
          style={{ top: '160px', height: '120px' }}
        />
        <Skeleton
          className="absolute rounded-lg left-4 right-4"
          style={{ top: '400px', height: '80px' }}
        />
      </div>
    </div>
  </div>
);

// Agenda View Skeleton
export const AgendaViewSkeleton: React.FC = () => (
  <div className="h-full bg-background border border-border/50 rounded-2xl overflow-hidden p-6">
    <div className="space-y-6">
      {Array.from({ length: 4 }).map((_, dayIdx) => (
        <div key={dayIdx}>
          <Skeleton className="h-5 w-40 mb-4 rounded" />
          <div className="space-y-3">
            {Array.from({ length: 2 + Math.floor(Math.random() * 3) }).map((_, eventIdx) => (
              <div key={eventIdx} className="flex items-center gap-4 p-3 rounded-xl bg-muted/10">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);
