# Migrating from 1.x to 2.0

2.0 is in pre-release on the `next` dist-tag (`npm install calendarkit-pro@next`). This page lists every breaking change, why it was made and what to do. It grows with each pre-release.

## Styles: no Tailwind setup

The calendar ships its own compiled stylesheet and adds it to the page once.

- Remove `'./node_modules/calendarkit-pro/**/*.{js,mjs}'` from your Tailwind `content` (optional: keeping it changes nothing).
- Your own CSS variables `--primary`, `--background`… no longer theme the calendar, so your design system and the calendar cannot clash. Pass the same colours through `theme={{ colors: { … } }}`, or set the `--ck-*` variables on `.ck-root` (see the README, Theming).
- With a Content-Security-Policy that forbids inline styles: `injectStyles={false}` and `import 'calendarkit-pro/styles.css'`.

## Default theme

**Why:** a neutral default that fits any product, with WCAG AA contrast in light and dark.

**What to do:** `theme="vivid"` for a look close to 1.x. A 1.x `theme` object keeps working (it applies on top of `calm`); add `preset: 'vivid'` to it to start from the 1.x colours.

## `cn` is no longer exported

**Why:** it wrapped `clsx` and `tailwind-merge`, two dependencies the calendar no longer needs, and has nothing to do with calendars.

**What to do:** keep your own copy.

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))
```
