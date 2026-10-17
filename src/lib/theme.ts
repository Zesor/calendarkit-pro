/**
 * Converts a color string (hex or rgb) to HSL values (h s% l%) for Tailwind CSS variables.
 * @param color - The color string (e.g., "#3b82f6", "3b82f6", "rgb(0, 84, 97)")
 * @returns The HSL string (e.g., "217 91% 60%") or null if invalid
 */
function colorToHsl(color: string): string | null {
  let r = 0, g = 0, b = 0;

  // Handle Hex
  if (color.startsWith('#') || /^[0-9a-fA-F]{3,6}$/.test(color)) {
    let c = color.replace(/^#/, '');
    if (c.length === 3) {
      c = c.split('').map(char => char + char).join('');
    }
    if (c.length !== 6) return null;
    
    r = parseInt(c.substring(0, 2), 16) / 255;
    g = parseInt(c.substring(2, 4), 16) / 255;
    b = parseInt(c.substring(4, 6), 16) / 255;
  } 
  // Handle RGB
  else if (color.startsWith('rgb')) {
    const match = color.match(/\d+/g);
    if (!match || match.length < 3) return null;
    r = parseInt(match[0]) / 255;
    g = parseInt(match[1]) / 255;
    b = parseInt(match[2]) / 255;
  } 
  else {
    return null;
  }

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  let l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }

    h /= 6;
  }

  const hDeg = Math.round(h * 360);
  const sPct = Math.round(s * 100);
  const lPct = Math.round(l * 100);

  return `${hDeg} ${sPct}% ${lPct}%`;
}

import { CalendarTheme } from '../types';

export function getThemeStyles(theme?: CalendarTheme): React.CSSProperties {
  if (!theme) return {};

  const styles: Record<string, string> = {};

  // Handle Colors
  if (theme.colors) {
    const mappings: Record<string, keyof typeof theme.colors> = {
      '--background': 'background',
      '--foreground': 'foreground',
      '--primary': 'primary',
      '--secondary': 'secondary',
      '--muted': 'muted',
      '--accent': 'accent',
      '--border': 'border',
    };

    Object.entries(mappings).forEach(([cssVar, themeKey]) => {
      const colorValue = theme.colors?.[themeKey];
      if (colorValue) {
        const hsl = colorToHsl(colorValue);
        if (hsl) {
          styles[cssVar] = hsl;
        }
      }
    });
  }

  // Handle Border Radius
  if (theme.borderRadius) {
    styles['--radius'] = theme.borderRadius;
  }

  // Handle Font Family
  if (theme.fontFamily) {
    styles['fontFamily'] = theme.fontFamily;
  }

  return styles as React.CSSProperties;
}
