interface StatBarProps {
  moves: number
  best: number | undefined
}

export function StatBar({ moves, best }: StatBarProps) {
  return (
    <div className="stat">
      <span>
        Moves: <b id="moves">{moves}</b>
      </span>
      <span>
        Best: <b id="best">{best != null ? best : '–'}</b>
      </span>
    </div>
  )
}
