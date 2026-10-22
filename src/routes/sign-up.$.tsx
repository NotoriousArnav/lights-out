import { SignUp } from '@clerk/tanstack-react-start'
import { createFileRoute } from '@tanstack/react-router'

import { AuthShell } from '../components/AuthShell'
import { clerkEnabled } from '../lib/clerk'

export const Route = createFileRoute('/sign-up/$')({
  component: SignUpPage,
})

function SignUpPage() {
  return (
    <AuthShell subtitle="Create an account to continue.">
      {clerkEnabled ? (
        <SignUp />
      ) : (
        <p className="auth__notice">
          Sign-up is not configured on this deployment.
        </p>
      )}
    </AuthShell>
  )
}
