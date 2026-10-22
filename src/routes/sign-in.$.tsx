import { SignIn } from '@clerk/tanstack-react-start'
import { createFileRoute } from '@tanstack/react-router'

import { AuthShell } from '../components/AuthShell'
import { clerkEnabled } from '../lib/clerk'

export const Route = createFileRoute('/sign-in/$')({
  component: SignInPage,
})

function SignInPage() {
  return (
    <AuthShell subtitle="Sign in to continue.">
      {clerkEnabled ? (
        <SignIn />
      ) : (
        <p className="auth__notice">
          Sign-in is not configured on this deployment.
        </p>
      )}
    </AuthShell>
  )
}
