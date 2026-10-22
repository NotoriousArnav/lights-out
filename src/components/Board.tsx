import type { Grid } from '../game/types'
import { Tile } from './Tile'

interface BoardProps {
  size: number
  grid: Grid
  hint: number | null
  locked: boolean
  onPress: (index: number) => void
}

export function Board({ size, grid, hint, locked, onPress }: BoardProps) {
  return (
    <div
      id="board"
      style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
    >
      {grid.map((on, index) => (
        <Tile
          key={index}
          index={index}
          on={on}
          hinted={hint === index}
          locked={locked}
          onPress={onPress}
        />
      ))}
    </div>
  )
}
