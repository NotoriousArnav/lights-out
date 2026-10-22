export const THEME_STORAGE_KEY = 'lo-theme'

export type Theme = 'light' | 'dark'

export function resolveTheme(
  explicit: string | undefined,
  systemPrefersDark: boolean,
): Theme {
  if (explicit === 'light' || explicit === 'dark') return explicit
  return systemPrefersDark ? 'dark' : 'light'
}

export function oppositeTheme(theme: Theme): Theme {
  return theme === 'dark' ? 'light' : 'dark'
}

/**
 * Runs in the document head before the first paint, so a saved theme never
 * flashes the other palette while React hydrates.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');var v=t==='light'||t==='dark';if(v)document.documentElement.dataset.theme=t;var d=v?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',d?'#14161c':'#f4f1ea')}catch(e){}})();`
