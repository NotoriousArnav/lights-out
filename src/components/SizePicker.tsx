import type { Size } from '../hooks/useGame'
import { SIZES } from '../hooks/useGame'

interface SizePickerProps {
  size: Size
  onChange: (size: Size) => void
}

export function SizePicker({ size, onChange }: SizePickerProps) {
  return (
    <div className="sizes" id="sizes">
      {SIZES.map((option) => (
        <button
          key={option}
          type="button"
          className={option === size ? 'active' : undefined}
          aria-pressed={option === size}
          onClick={() => onChange(option)}
        >
          {option}×{option}
        </button>
      ))}
    </div>
  )
}
