import React from 'react';
import { cx } from '../utils';

// Base skeleton block: callers set its size and rounding.
const Skeleton: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <div className={cx("ck:animate-pulse ck:bg-muted/40", className)} style={style} />
);

// Month View Skeleton
export const MonthViewSkeleton: React.FC = () => (
  <div className="ck:h-full ck:bg-background ck:border ck:border-border/50 ck:rounded-2xl ck:overflow-hidden">
    {/* Header */}
    <div className="ck:grid ck:grid-cols-7 ck:border-b ck:border-border/50 ck:bg-muted/10">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="ck:py-3 ck:px-2 ck:text-center ck:border-r ck:border-border/30 ck:last:border-r-0">
          <Skeleton className="ck:h-4 ck:w-8 ck:mx-auto ck:rounded-sm" />
        </div>
      ))}
    </div>
    {/* Grid */}
    <div className="ck:grid ck:grid-cols-7 ck:flex-1">
      {Array.from({ length: 35 }).map((_, i) => (
        <div key={i} className="ck:min-h-[120px] ck:border-r ck:border-b ck:border-border/30 ck:p-2">
          <Skeleton className="ck:h-4 ck:w-6 ck:mb-2 ck:rounded-sm" />
          <div className="ck:space-y-1">
            {/* Deterministic pattern: Math.random() broke SSR hydration. */}
            {(i * 7) % 10 > 4 && <Skeleton className="ck:h-5 ck:w-full ck:rounded-md" />}
            {(i * 3) % 10 > 6 && <Skeleton className="ck:h-5 ck:w-3/4 ck:rounded-md" />}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Week View Skeleton
export const WeekViewSkeleton: React.FC = () => (
  <div className="ck:h-full ck:bg-background ck:border ck:border-border/50 ck:rounded-2xl ck:overflow-hidden">
    {/* Header */}
    <div className="ck:flex ck:border-b ck:border-border/50 ck:bg-muted/10">
      <div className="ck:w-16 ck:p-3 ck:border-r ck:border-border/30">
        <Skeleton className="ck:h-8 ck:w-10 ck:mx-auto ck:rounded-sm" />
      </div>
      <div className="ck:flex-1 ck:grid ck:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="ck:py-3 ck:px-2 ck:text-center ck:border-r ck:border-border/30 ck:last:border-r-0">
            <Skeleton className="ck:h-3 ck:w-8 ck:mx-auto ck:mb-1 ck:rounded-sm" />
            <Skeleton className="ck:h-8 ck:w-8 ck:mx-auto ck:rounded-xl" />
          </div>
        ))}
      </div>
    </div>
    {/* Grid */}
    <div className="ck:flex ck:flex-1" style={{ height: '600px' }}>
      <div className="ck:w-16 ck:border-r ck:border-border/30">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="ck:h-[60px] ck:relative">
            <Skeleton className="ck:h-4 ck:w-10 ck:absolute ck:right-2 ck:-translate-y-1/2 ck:rounded-sm" />
          </div>
        ))}
      </div>
      <div className="ck:flex-1 ck:grid ck:grid-cols-7 ck:relative">
        {Array.from({ length: 7 }).map((_, colIdx) => (
          <div key={colIdx} className="ck:relative ck:border-r ck:border-border/30 ck:last:border-r-0">
            {Array.from({ length: 10 }).map((_, rowIdx) => (
              <div key={rowIdx} className="ck:h-[60px] ck:border-b ck:border-dashed ck:border-border/20" />
            ))}
            {/* Random events */}
            {Math.random() > 0.3 && (
              <Skeleton
                className="ck:absolute ck:rounded-md"
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
  <div className="ck:h-full ck:bg-background ck:border ck:border-border/50 ck:rounded-2xl ck:overflow-hidden">
    {/* Header */}
    <div className="ck:px-6 ck:py-4 ck:border-b ck:border-border/50 ck:bg-muted/10 ck:text-center">
      <Skeleton className="ck:h-7 ck:w-64 ck:mx-auto ck:rounded-sm" />
    </div>
    {/* Grid */}
    <div className="ck:flex ck:flex-1" style={{ height: '600px' }}>
      <div className="ck:w-20 ck:border-r ck:border-border/30 ck:bg-muted/5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="ck:h-[80px] ck:relative">
            <Skeleton className="ck:h-4 ck:w-12 ck:absolute ck:left-1/2 ck:-translate-x-1/2 ck:-translate-y-1/2 ck:rounded-sm" />
          </div>
        ))}
      </div>
      <div className="ck:flex-1 ck:relative">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="ck:h-[80px] ck:border-b ck:border-dashed ck:border-border/20" />
        ))}
        {/* Random events */}
        <Skeleton
          className="ck:absolute ck:rounded-lg ck:left-4 ck:right-4"
          style={{ top: '160px', height: '120px' }}
        />
        <Skeleton
          className="ck:absolute ck:rounded-lg ck:left-4 ck:right-4"
          style={{ top: '400px', height: '80px' }}
        />
      </div>
    </div>
  </div>
);

// Agenda View Skeleton
export const AgendaViewSkeleton: React.FC = () => (
  <div className="ck:h-full ck:bg-background ck:border ck:border-border/50 ck:rounded-2xl ck:overflow-hidden ck:p-6">
    <div className="ck:space-y-6">
      {Array.from({ length: 4 }).map((_, dayIdx) => (
        <div key={dayIdx}>
          <Skeleton className="ck:h-5 ck:w-40 ck:mb-4 ck:rounded-sm" />
          <div className="ck:space-y-3">
            {Array.from({ length: 2 + Math.floor(Math.random() * 3) }).map((_, eventIdx) => (
              <div key={eventIdx} className="ck:flex ck:items-center ck:gap-4 ck:p-3 ck:rounded-xl ck:bg-muted/10">
                <Skeleton className="ck:h-10 ck:w-10 ck:rounded-lg" />
                <div className="ck:flex-1 ck:space-y-2">
                  <Skeleton className="ck:h-4 ck:w-3/4 ck:rounded-sm" />
                  <Skeleton className="ck:h-3 ck:w-1/2 ck:rounded-sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);
