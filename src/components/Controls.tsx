interface ControlsProps {
  onHint: () => void
  onReset: () => void
  onScores: () => void
  busy: boolean
  hinting: boolean
  done: boolean
}

export function Controls({
  onHint,
  onReset,
  onScores,
  busy,
  hinting,
  done,
}: ControlsProps) {
  return (
    <div className="bar">
      <button type="button" id="hint" onClick={onHint} disabled={busy || hinting || done}>
        {hinting ? 'Hint…' : 'Hint'}
      </button>
      <button type="button" id="reset" onClick={onReset} disabled={busy}>
        New puzzle
      </button>
      <button
        type="button"
        className="scores-open"
        onClick={onScores}
        aria-haspopup="dialog"
      >
        Scores
      </button>
    </div>
  )
}
