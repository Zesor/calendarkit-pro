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
  <div className="flex flex-col items-center justify-center h-full min-h-[400px] py-12">
    <div className="relative mb-8">
      <div className="p-8 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/10 dark:to-blue-900/10 rounded-3xl border border-border/30">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="text-left">
            <div className="font-medium text-foreground">{translations?.allCaughtUp || 'All caught up!'}</div>
            <div className="text-sm text-muted-foreground">{translations?.noEventsScheduled || 'No events scheduled'}</div>
          </div>
        </div>
      </div>
    </div>

    <div className="text-center max-w-sm">
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {translations?.noUpcoming || 'Your schedule is clear'}
      </h3>
      <p className="text-sm text-muted-foreground mb-6">
        {translations?.noUpcomingHint || 'No upcoming events to show. Create a new event to start planning.'}
      </p>

      {onCreateEvent && (
        <button
          onClick={onCreateEvent}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:scale-105 active:scale-95 transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          {translations?.createEvent || 'Create Event'}
        </button>
      )}
    </div>
  </div>
);
