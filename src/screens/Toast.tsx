import { useEffect, useRef, useState } from 'react'

/**
 * Shared transient toast: call showToast(message), render <Toast …/> once at
 * the end of the screen. Auto-dismisses; re-showing resets the timer.
 */
export function useToast(durationMs = 3800) {
  const [toast, setToast] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  function showToast(message: string) {
    setToast(message)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), durationMs)
  }
  return { toast, showToast }
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="toast" role="status" aria-live="polite">
      {message}
    </div>
  )
}
