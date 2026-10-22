import {
  THEME_STORAGE_KEY,
  oppositeTheme,
  resolveTheme,
  type Theme,
} from '../lib/theme'

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Storage can be unavailable (private mode, blocked cookies); the theme
    // still applies for this page view.
  }

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', theme === 'dark' ? '#14161c' : '#f4f1ea')
  }
}

export function ThemeToggle() {
  function toggle() {
    const current = resolveTheme(
      document.documentElement.dataset.theme,
      window.matchMedia('(prefers-color-scheme: dark)').matches,
    )
    applyTheme(oppositeTheme(current))
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label="Toggle light and dark mode"
      title="Toggle light and dark mode"
      onClick={toggle}
    >
      <svg
        className="theme-toggle__moon"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>

      <svg
        className="theme-toggle__sun"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.42 1.42" />
      </svg>
    </button>
  )
}
