import type { ComponentProps } from 'react'
import type { ClerkProvider } from '@clerk/tanstack-react-start'

/**
 * Clerk is optional in development: without a publishable key the app runs as
 * a guest-only game instead of crashing on a missing configuration.
 */
export const clerkPublishableKey =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim() || undefined

export const clerkEnabled = Boolean(clerkPublishableKey)

/**
 * The Clerk components are themed with the same CSS variables as the game so
 * light/dark mode, accents, and surfaces stay in sync.
 */
export const clerkAppearance: NonNullable<
  ComponentProps<typeof ClerkProvider>['appearance']
> = {
  variables: {
    colorPrimary: 'var(--accent)',
    colorPrimaryForeground: '#ffffff',
    colorBackground: 'var(--card)',
    colorForeground: 'var(--text)',
    colorMuted: 'var(--off)',
    colorMutedForeground: 'var(--muted)',
    colorInput: 'var(--card)',
    colorInputForeground: 'var(--text)',
    colorNeutral: 'var(--text)',
    colorBorder: 'var(--off)',
    colorRing: 'var(--accent)',
    colorDanger: '#d64545',
    fontFamily:
      "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    borderRadius: '10px',
  },
  elements: {
    cardBox: {
      border: '1px solid var(--off)',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.15)',
    },
    card: {
      backgroundColor: 'var(--card)',
    },
    headerTitle: {
      color: 'var(--text)',
    },
    headerSubtitle: {
      color: 'var(--muted)',
    },
    socialButtonsBlockButton: {
      borderColor: 'var(--off)',
      color: 'var(--text)',
    },
    formButtonPrimary: {
      backgroundColor: 'var(--accent)',
      color: '#ffffff',
    },
    footerActionLink: {
      color: 'var(--accent)',
    },
  },
}
