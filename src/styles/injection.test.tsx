// The stylesheet is added to the page once, however many calendars, unless the host opts out.
// Its own file: each test file gets a fresh document, and React remembers the styles it hoisted.
import { render } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { resetWarnings } from '../core/warn'
import { Scheduler } from '../index'
import { insertStyles } from './CalendarStyles'
import { css } from './css.generated'

const injected = () => document.querySelectorAll('style[data-href="calendarkit-pro"]')

beforeEach(() => resetWarnings())

describe('style injection', () => {
  test('injectStyles={false} adds nothing, and warns in development while the stylesheet is missing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(<Scheduler view="month" injectStyles={false} />)
    expect(document.querySelectorAll('style')).toHaveLength(0)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("import 'calendarkit-pro/styles.css'"))
  })

  test('injectStyles={false} with calendarkit-pro/styles.css loaded: no warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const sheet = document.createElement('style')
    sheet.textContent = '.ck-root { --ck-styles: 1; }'
    document.head.appendChild(sheet)
    render(<Scheduler view="month" injectStyles={false} />)
    sheet.remove()
    expect(warn).not.toHaveBeenCalled()
  })

  test('two calendars add the stylesheet to <head> once', async () => {
    render(<><Scheduler view="month" /><Scheduler view="week" /></>)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(injected()).toHaveLength(1)
    expect(injected()[0].parentElement).toBe(document.head)
    expect(injected()[0].textContent).toBe(css)
  })

  test('the React 18 path (insertStyles) adds one copy per document, and none next to the React 19 one', () => {
    const page = document.implementation.createHTMLDocument()
    insertStyles(page)
    insertStyles(page)
    expect(page.head.querySelectorAll('style')).toHaveLength(1)
    expect(page.head.querySelector('style')!.textContent).toBe(css)
    insertStyles(document)
    expect(injected()).toHaveLength(1)
  })
})
