import { useEffect, useRef, useState } from 'react'

/**
 * Registers the generated service worker and offers a reload prompt when a
 * new version is waiting. Updates are deliberately not forced: reloading
 * during a game would discard the current run.
 */
export function PwaRegistration() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  const reloadRequested = useRef(false)

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

    let active = true
    let registration: ServiceWorkerRegistration | undefined
    let updateHandler: (() => void) | undefined

    const handleControllerChange = () => {
      if (reloadRequested.current) {
        window.location.reload()
      }
    }

    const showWaitingWorker = (reg: ServiceWorkerRegistration) => {
      if (!active || !reg.waiting || !navigator.serviceWorker.controller) {
        return
      }
      setWaitingWorker(reg.waiting)
    }

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      handleControllerChange,
    )

    void navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        if (!active) return

        registration = reg
        showWaitingWorker(reg)

        updateHandler = () => {
          const installing = reg.installing
          if (!installing) return

          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed') {
              showWaitingWorker(reg)
            }
          })
        }

        reg.addEventListener('updatefound', updateHandler)
      })
      .catch(() => {
        // A failed registration should never break the game.
      })

    const checkForUpdates = () => {
      if (document.visibilityState === 'visible') {
        void registration?.update().catch(() => {})
      }
    }

    document.addEventListener('visibilitychange', checkForUpdates)

    return () => {
      active = false
      document.removeEventListener('visibilitychange', checkForUpdates)
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        handleControllerChange,
      )
      if (registration && updateHandler) {
        registration.removeEventListener('updatefound', updateHandler)
      }
    }
  }, [])

  const applyUpdate = () => {
    if (!waitingWorker) return
    reloadRequested.current = true
    waitingWorker.postMessage({ type: 'SKIP_WAITING' })
  }

  if (!waitingWorker) return null

  return (
    <div className="pwa-update" role="status">
      <span>New version ready.</span>
      <button type="button" onClick={applyUpdate}>
        Reload
      </button>
    </div>
  )
}
