import React from 'react';
import { Plus } from './icons';

// Empty state specifically for Agenda View with date context
export const AgendaEmptyState: React.FC<{
  onCreateEvent?: () => void;
  translations?: {
    noUpcoming?: string;
    noUpcomingHint?: string;
    allCaughtUp?: string;
    noEventsScheduled?: string;
    createEvent?: string;
  };
}> = ({ onCreateEvent, translations }) => (
  <div className="ck:flex ck:flex-col ck:items-center ck:justify-center ck:h-full ck:min-h-[400px] ck:py-12">
    <div className="ck:relative ck:mb-8">
      <div className="ck:p-8 ck:bg-muted ck:rounded-3xl ck:border ck:border-border/30">
        <div className="ck:flex ck:items-center ck:gap-4">
          <div className="ck:w-12 ck:h-12 ck:rounded-2xl ck:bg-background ck:flex ck:items-center ck:justify-center">
            <svg className="ck:w-6 ck:h-6 ck:text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="ck:text-left">
            <div className="ck:font-medium ck:text-foreground">{translations?.allCaughtUp || 'All caught up!'}</div>
            <div className="ck:text-sm ck:text-muted-foreground">{translations?.noEventsScheduled || 'No events scheduled'}</div>
          </div>
        </div>
      </div>
    </div>

    <div className="ck:text-center ck:max-w-sm">
      <h3 className="ck:text-lg ck:font-semibold ck:text-foreground ck:mb-2">
        {translations?.noUpcoming || 'Your schedule is clear'}
      </h3>
      <p className="ck:text-sm ck:text-muted-foreground ck:mb-6">
        {translations?.noUpcomingHint || 'No upcoming events to show. Create a new event to start planning.'}
      </p>

      {onCreateEvent && (
        <button
          onClick={onCreateEvent}
          className="ck:inline-flex ck:items-center ck:gap-2 ck:px-5 ck:py-2.5 ck:bg-primary ck:text-primary-foreground ck:rounded-xl ck:font-medium ck:text-sm ck:shadow-lg ck:shadow-primary/20 ck:hover:shadow-xl ck:hover:shadow-primary/30 ck:hover:scale-105 ck:active:scale-95 ck:transition-all ck:duration-200"
        >
          <Plus className="ck:w-4 ck:h-4" />
          {translations?.createEvent || 'Create Event'}
        </button>
      )}
    </div>
  </div>
);
