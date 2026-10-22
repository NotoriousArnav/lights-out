import {
  ClerkFailed,
  ClerkLoaded,
  ClerkLoading,
  SignIn,
} from '@clerk/tanstack-react-start'
import { createFileRoute } from '@tanstack/react-router'

import { AuthLoading } from '../components/AuthLoading'
import { AuthShell } from '../components/AuthShell'
import { clerkEnabled } from '../lib/clerk'

export const Route = createFileRoute('/sign-in/$')({
  head: () => ({
    meta: [{ name: 'robots', content: 'noindex, nofollow' }],
  }),
  component: SignInPage,
})

function SignInPage() {
  return (
    <AuthShell subtitle="Sign in to continue.">
      {clerkEnabled ? (
        <>
          <ClerkLoading>
            <AuthLoading label="Loading sign-in…" />
          </ClerkLoading>

          <ClerkFailed>
            <p className="auth__notice">
              Sign-in could not load. Refresh the page to try again.
            </p>
          </ClerkFailed>

          <ClerkLoaded>
            <SignIn />
          </ClerkLoaded>
        </>
      ) : (
        <p className="auth__notice">
          Sign-in is not configured on this deployment.
        </p>
      )}
    </AuthShell>
  )
}
