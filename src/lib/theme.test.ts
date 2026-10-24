import { describe, expect, test } from 'vitest'
import { colorMode, getThemeStyles, themePreset } from './theme'

describe('theme prop', () => {
  test('selects a preset by name or through the object, calm by default', () => {
    expect(themePreset()).toBe('calm')
    expect(themePreset('vivid')).toBe('vivid')
    expect(themePreset({ preset: 'editorial', colors: { primary: '#000' } })).toBe('editorial')
    expect(themePreset({ colors: { primary: '#000' } })).toBe('calm')
  })

  test('a 1.x theme object overrides the matching tokens with its values as given', () => {
    expect(getThemeStyles({ colors: { primary: '#3b82f6', background: 'white', foreground: 'rgb(26 26 26)' }, fontFamily: 'Inter, sans-serif', borderRadius: '12px' })).toEqual({
      '--ck-primary': '#3b82f6',
      '--ck-background': 'white',
      '--ck-foreground': 'rgb(26 26 26)',
      '--ck-font': 'Inter, sans-serif',
      '--ck-radius': '12px',
    })
    expect(getThemeStyles({ colors: { primaryForeground: '#fff', mutedForeground: '#555', secondary: '#eee', ring: 'teal' } })).toEqual({
      '--ck-primary-foreground': '#fff',
      '--ck-muted-foreground': '#555',
      '--ck-secondary': '#eee',
      '--ck-ring': 'teal',
    })
    expect(getThemeStyles('vivid')).toEqual({})
    expect(getThemeStyles()).toEqual({})
  })

  test('mode wins over the isDarkMode alias; neither leaves the mode to a .dark ancestor', () => {
    expect(colorMode('system', true)).toBe('system')
    expect(colorMode(undefined, true)).toBe('dark')
    expect(colorMode(undefined, false)).toBe('light')
    expect(colorMode()).toBeUndefined()
  })
})
