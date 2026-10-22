import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'

import {
  THEME_STORAGE_KEY,
  oppositeTheme,
  resolveTheme,
  themeInitScript,
} from '../src/lib/theme'

function boot(html = '<meta name="theme-color" content="#f4f1ea">') {
  return new JSDOM(html, { url: 'https://example.com/', runScripts: 'outside-only' })
}

describe('theme preference', () => {
  it('prefers an explicit choice over the system setting', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })

  it('falls back to the system setting when nothing is saved', () => {
    expect(resolveTheme(undefined, true)).toBe('dark')
    expect(resolveTheme(undefined, false)).toBe('light')
    expect(resolveTheme('sepia', true)).toBe('dark')
  })

  it('toggles between the two themes', () => {
    expect(oppositeTheme('light')).toBe('dark')
    expect(oppositeTheme('dark')).toBe('light')
  })
})

describe('theme init script', () => {
  it('applies a saved dark theme before paint', () => {
    const dom = boot()
    dom.window.localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    dom.window.eval(themeInitScript)

    const doc = dom.window.document
    expect(doc.documentElement.dataset.theme).toBe('dark')
    expect(doc.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#14161c')
  })

  it('applies a saved light theme', () => {
    const dom = boot()
    dom.window.localStorage.setItem(THEME_STORAGE_KEY, 'light')
    dom.window.eval(themeInitScript)

    const doc = dom.window.document
    expect(doc.documentElement.dataset.theme).toBe('light')
    expect(doc.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#f4f1ea')
  })

  it('leaves the system default alone without a valid saved theme', () => {
    const dom = boot()
    dom.window.eval(themeInitScript)
    expect(dom.window.document.documentElement.dataset.theme).toBeUndefined()

    dom.window.localStorage.setItem(THEME_STORAGE_KEY, 'sepia')
    dom.window.eval(themeInitScript)
    expect(dom.window.document.documentElement.dataset.theme).toBeUndefined()
  })
})
