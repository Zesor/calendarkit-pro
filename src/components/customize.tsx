import React from 'react';
import type { CalendarClassNames } from '../types';

// The host's `classNames`, read where each part is drawn (no prop threading through the views).
const ClassNamesContext = React.createContext<CalendarClassNames>({});
export const ClassNamesProvider = ClassNamesContext.Provider;
export const useClassNames = () => React.useContext(ClassNamesContext);
