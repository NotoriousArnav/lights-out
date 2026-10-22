import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

type AuthShellProps = {
  subtitle: string
  children: ReactNode
}

/**
 * Shared frame for the Clerk-hosted screens. It keeps the game's typography
 * and background around Clerk's card instead of dropping users onto a bare
 * third-party page.
 */
export function AuthShell({ subtitle, children }: AuthShellProps) {
  return (
    <main className="auth">
      <div className="auth__brand">
        <h1>Lights Out</h1>
        <p className="sub">{subtitle}</p>
      </div>

      {children}

      <Link to="/" className="auth__back">
        Back to the game
      </Link>
    </main>
  )
}
