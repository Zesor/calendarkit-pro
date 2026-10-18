import * as React from 'react'
import { warnOnce } from '../core/warn'
import { css } from './css.generated'

const HREF = 'calendarkit-pro'

// React 19 hoists a <style href precedence> into <head> once per page, during server rendering too.
const hoistsStyles = Number.parseInt(React.version, 10) >= 19

/** Inserts the stylesheet into document.head once (React 18 path). */
export function insertStyles(doc: Document): void {
  if (doc.querySelector(`style[data-href="${HREF}"]`)) return
  const style = doc.createElement('style')
  style.setAttribute('data-href', HREF)
  style.textContent = css
  doc.head.appendChild(style)
}

function InsertedStyles() {
  React.useInsertionEffect(() => insertStyles(document), [])
  return null
}

/** The compiled stylesheet, added once to the page however many calendars it shows. */
export function CalendarStyles() {
  if (hoistsStyles) {
    return (
      <style href={HREF} precedence="calendarkit">
        {css}
      </style>
    )
  }
  return <InsertedStyles />
}

/**
 * Development warning when a calendar renders without its stylesheet: `injectStyles={false}` and no
 * `calendarkit-pro/styles.css` (the stylesheet sets the `--ck-styles` sentinel on `.ck-root`).
 */
export function useMissingStylesWarning(root: React.RefObject<HTMLElement | null>, injected: boolean) {
  React.useEffect(() => {
    if (injected || !root.current) return
    if (getComputedStyle(root.current).getPropertyValue('--ck-styles').trim() === '') {
      warnOnce('missing-styles', "The calendar renders without its stylesheet: with injectStyles={false}, import 'calendarkit-pro/styles.css'.")
    }
  }, [injected, root])
}
