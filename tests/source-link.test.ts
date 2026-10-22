// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { SourceLink } from '../src/components/SourceLink'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
})

let container: HTMLDivElement
let root: Root | undefined

beforeEach(() => {
  container = document.createElement('div')
  document.body.append(container)
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = undefined
  container.remove()
})

describe('SourceLink', () => {
  it('links to the public repository in a new tab', async () => {
    root = createRoot(container)

    await act(async () => {
      root!.render(createElement(SourceLink))
    })

    const link = container.querySelector('a')
    expect(link).not.toBeNull()
    expect(link!.getAttribute('href')).toBe(
      'https://github.com/NotoriousArnav/lights-out',
    )
    expect(link!.getAttribute('target')).toBe('_blank')
    expect(link!.getAttribute('rel')).toBe('noopener noreferrer')
    expect(link!.getAttribute('aria-label')).toBe(
      'View the source code on GitHub',
    )
  })
})
