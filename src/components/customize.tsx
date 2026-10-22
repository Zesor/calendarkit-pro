import React from 'react';
import type { CalendarClassNames, CalendarComponents } from '../types';

// The host's `classNames` and `components`, read where each part is drawn (no prop threading through the views).
const ClassNamesContext = React.createContext<CalendarClassNames>({});
export const ClassNamesProvider = ClassNamesContext.Provider;
export const useClassNames = () => React.useContext(ClassNamesContext);

const ComponentsContext = React.createContext<CalendarComponents>({});
export const ComponentsProvider = ComponentsContext.Provider;
export const useComponents = () => React.useContext(ComponentsContext);
