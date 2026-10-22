import { useEffect, useRef, type ReactNode } from 'react'

interface ScoresDialogProps {
  onClose: () => void
  children: ReactNode
}

/**
 * Native modal dialog: focus trapping, Escape handling and the page scroll
 * lock come from the browser. The dialog only mounts while it is open, so a
 * closed overview leaves no hidden markup behind on small screens.
 */
export function ScoresDialog({ onClose, children }: ScoresDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog || dialog.open) return
    dialog.showModal()
    // No cleanup-close here: StrictMode runs setup → cleanup → setup in
    // development, and closing in cleanup fires `close`, which would tell the
    // parent to unmount the dialog the instant it opened. Removing the element
    // from the document closes it on a real unmount.
  }, [])

  return (
    <dialog
      ref={ref}
      className="scores-dialog"
      onClose={onClose}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === ref.current) ref.current?.close()
      }}
    >
      <div className="scores-dialog__panel">
        <button
          type="button"
          className="scores-dialog__close"
          aria-label="Close high scores"
          onClick={() => ref.current?.close()}
        >
          ×
        </button>
        {children}
      </div>
    </dialog>
  )
}
