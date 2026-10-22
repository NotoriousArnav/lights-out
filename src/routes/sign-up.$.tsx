import {
  ClerkFailed,
  ClerkLoaded,
  ClerkLoading,
  SignUp,
} from '@clerk/tanstack-react-start'
import { createFileRoute } from '@tanstack/react-router'

import { AuthLoading } from '../components/AuthLoading'
import { AuthShell } from '../components/AuthShell'
import { clerkEnabled } from '../lib/clerk'

export const Route = createFileRoute('/sign-up/$')({
  head: () => ({
    meta: [{ name: 'robots', content: 'noindex, nofollow' }],
  }),
  component: SignUpPage,
})

function SignUpPage() {
  return (
    <AuthShell subtitle="Create an account to continue.">
      {clerkEnabled ? (
        <>
          <ClerkLoading>
            <AuthLoading label="Loading sign-up…" />
          </ClerkLoading>

          <ClerkFailed>
            <p className="auth__notice">
              Sign-up could not load. Refresh the page to try again.
            </p>
          </ClerkFailed>

          <ClerkLoaded>
            <SignUp />
          </ClerkLoaded>
        </>
      ) : (
        <p className="auth__notice">
          Sign-up is not configured on this deployment.
        </p>
      )}
    </AuthShell>
  )
}
