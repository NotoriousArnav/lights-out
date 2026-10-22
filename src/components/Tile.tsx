interface TileProps {
  index: number
  on: boolean
  hinted: boolean
  locked: boolean
  onPress: (index: number) => void
}

export function Tile({ index, on, hinted, locked, onPress }: TileProps) {
  return (
    <button
      type="button"
      className={['cell', on ? 'on' : '', hinted ? 'hint' : '']
        .filter(Boolean)
        .join(' ')}
      aria-label={`Tile ${index + 1}, ${on ? 'lit' : 'dark'}`}
      aria-disabled={locked || undefined}
      onClick={() => onPress(index)}
    />
  )
}
