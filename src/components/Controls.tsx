interface ControlsProps {
  onHint: () => void
  onReset: () => void
}

export function Controls({ onHint, onReset }: ControlsProps) {
  return (
    <div className="bar">
      <button type="button" id="hint" onClick={onHint}>
        Hint
      </button>
      <button type="button" id="reset" onClick={onReset}>
        New puzzle
      </button>
    </div>
  )
}
