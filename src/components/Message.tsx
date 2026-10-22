interface MessageProps {
  children: string
}

export function Message({ children }: MessageProps) {
  return (
    <div id="msg" role="status" aria-live="polite">
      {children}
    </div>
  )
}
