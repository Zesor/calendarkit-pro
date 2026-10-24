import React from 'react';
import { CalendarTranslations } from '../types';

/** Spec §8.5: closing a draft with changes asks first ("Discard changes? Keep editing / Discard"). */
export const DiscardPrompt: React.FC<{ translations: CalendarTranslations; onKeep: () => void; onDiscard: () => void }> = ({ translations: t, onKeep, onDiscard }) => (
  <div role="alertdialog" aria-label={t.discardChanges} className="ck:flex ck:w-full ck:items-center ck:gap-2">
    <span className="ck:flex-1 ck:text-sm ck:font-medium ck:text-foreground">{t.discardChanges}</span>
    <button type="button" autoFocus className="ck:rounded-lg ck:px-3 ck:py-1.5 ck:text-sm ck:font-semibold ck:hover:bg-muted" onClick={onKeep}>{t.keepEditing}</button>
    <button type="button" className="ck:rounded-lg ck:px-3 ck:py-1.5 ck:text-sm ck:font-semibold ck:text-destructive ck:hover:bg-destructive/10" onClick={onDiscard}>{t.discard}</button>
  </div>
);
