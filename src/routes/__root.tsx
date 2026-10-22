import { ClerkProvider } from '@clerk/tanstack-react-start'
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

import appCss from '../styles.css?url'
import { clerkAppearance, clerkEnabled } from '../lib/clerk'
import { themeInitScript } from '../lib/theme'
import { ThemeToggle } from '../components/ThemeToggle'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content:
          'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      { title: 'Lights Out' },
      {
        name: 'description',
        content:
          'Tap a tile to flip it and its neighbors. Turn every light off in as few moves as possible.',
      },
      { name: 'theme-color', content: '#f4f1ea' },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeToggle />

        {clerkEnabled ? (
          <ClerkProvider appearance={clerkAppearance}>{children}</ClerkProvider>
        ) : (
          children
        )}

        <Scripts />
      </body>
    </html>
  )
}
