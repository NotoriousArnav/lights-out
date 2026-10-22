interface SpinnerProps {
  size?: 'sm' | 'md'
  label?: string
  className?: string
}

/**
 * Small CSS spinner for loading states. Pass `label` when the spinner stands
 * alone; omit it when visible loading text sits next to the spinner.
 */
export function Spinner({ size = 'md', label, className }: SpinnerProps) {
  const classes = ['spinner', `spinner--${size}`, className]
    .filter(Boolean)
    .join(' ')

  if (!label) {
    return <span className={classes} aria-hidden="true" />
  }

  return (
    <span className={classes} role="status">
      <span className="sr-only">{label}</span>
    </span>
  )
}
