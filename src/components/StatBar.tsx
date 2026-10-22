interface StatBarProps {
  moves: number
  best: number | undefined
  elapsedMs: number
}

function formatTime(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export function StatBar({ moves, best, elapsedMs }: StatBarProps) {
  return (
    <div className="stat">
      <span>
        Moves: <b id="moves">{moves}</b>
      </span>
      <span>
        Best: <b id="best">{best != null ? best : '–'}</b>
      </span>
      <span>
        Time: <b id="time">{formatTime(elapsedMs)}</b>
      </span>
    </div>
  )
}
