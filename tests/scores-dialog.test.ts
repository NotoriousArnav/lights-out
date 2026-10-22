// @vitest-environment jsdom
import { StrictMode, act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { ScoresDialog } from '../src/components/ScoresDialog'

declare global {
  // React's act environment flag.
  var IS_REACT_ACT_ENVIRONMENT: boolean
}

/**
 * jsdom exposes HTMLDialogElement but does not implement its methods. Keep the
 * shim close to the native contract: closing fires a close event, which is what
 * the component uses to tell its parent it is done.
 */
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    if (this.open) throw new Error('dialog is already open')
    this.open = true
  }

  HTMLDialogElement.prototype.close = function close() {
    if (!this.open) return
    this.open = false
    this.dispatchEvent(new Event('close'))
  }

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

function Harness({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(true)

  if (!open) return null

  return createElement(ScoresDialog, {
    onClose: () => {
      onClose()
      setOpen(false)
    },
    children: createElement('p', null, 'scores'),
  })
}

describe('ScoresDialog', () => {
  it('stays open through the StrictMode effect replay', async () => {
    const onClose = vi.fn()
    root = createRoot(container)

    await act(async () => {
      root!.render(createElement(StrictMode, null, createElement(Harness, { onClose })))
    })

    const dialog = container.querySelector('dialog')
    expect(dialog).not.toBeNull()
    expect(dialog!.open).toBe(true)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('still reports a real close to the parent', async () => {
    const onClose = vi.fn()
    root = createRoot(container)

    await act(async () => {
      root!.render(createElement(Harness, { onClose }))
    })

    const dialog = container.querySelector('dialog')!
    expect(onClose).not.toHaveBeenCalled()

    await act(async () => {
      dialog.close()
    })

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(container.querySelector('dialog')).toBeNull()
  })
})
