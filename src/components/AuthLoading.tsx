import { Spinner } from './Spinner'

interface AuthLoadingProps {
  label: string
}

/**
 * Clerk-card-sized placeholder. Keeping the approximate card height stops
 * the page from jumping when Clerk JS finishes loading.
 */
export function AuthLoading({ label }: AuthLoadingProps) {
  return (
    <div className="auth__loading" role="status" aria-live="polite">
      <Spinner />
      <span>{label}</span>
    </div>
  )
}
