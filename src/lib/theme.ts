import type { CSSProperties } from 'react';
import type { CalendarTheme, ColorMode, ThemeColors, ThemePreset } from '../types';

// The stylesheet's tokens (src/styles/themes.css) each colour of a theme object overrides.
const TOKENS: Record<keyof ThemeColors, string> = {
  primary: '--ck-primary',
  primaryForeground: '--ck-primary-foreground',
  secondary: '--ck-secondary',
  background: '--ck-background',
  foreground: '--ck-foreground',
  border: '--ck-border',
  muted: '--ck-muted',
  mutedForeground: '--ck-muted-foreground',
  accent: '--ck-accent',
  destructive: '--ck-destructive',
  ring: '--ck-ring',
};

/** The preset a `theme` prop selects (`calm` by default). */
export const themePreset = (theme?: CalendarTheme | ThemePreset): ThemePreset =>
  (typeof theme === 'string' ? theme : theme?.preset) ?? 'calm';

/**
 * Inline token overrides of a theme object. Inline custom properties are set one by one by React,
 * so a value can never escape its declaration.
 */
export function getThemeStyles(theme?: CalendarTheme | ThemePreset): CSSProperties {
  if (!theme || typeof theme === 'string') return {};
  const styles: Record<string, string> = {};
  for (const [key, token] of Object.entries(TOKENS)) {
    const value = theme.colors?.[key as keyof ThemeColors];
    if (value) styles[token] = value;
  }
  if (theme.borderRadius) styles['--ck-radius'] = theme.borderRadius;
  if (theme.fontFamily) styles['--ck-font'] = theme.fontFamily;
  return styles as CSSProperties;
}

/** `mode`, else the 1.x `isDarkMode` alias; `undefined` lets a `.dark` ancestor decide (1.x behavior). */
export const colorMode = (mode?: ColorMode, isDarkMode?: boolean): ColorMode | undefined =>
  mode ?? (isDarkMode === undefined ? undefined : isDarkMode ? 'dark' : 'light');
