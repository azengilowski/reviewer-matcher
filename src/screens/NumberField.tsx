import { useEffect, useRef, useState } from 'react'

/**
 * Number input that behaves during editing:
 * - scroll-wheel changes are disabled (wheeling over a focused input silently
 *   corrupted values), the page scrolls instead
 * - backspacing to empty is allowed; the empty/invalid draft is shown with an
 *   error style and reported via onValidityChange, and only valid values are
 *   committed to the store
 */
export function NumberField({
  value,
  min,
  ariaLabel,
  onCommit,
  onValidityChange,
}: {
  value: number
  min: number
  ariaLabel: string
  onCommit: (n: number) => void
  onValidityChange?: (valid: boolean) => void
}) {
  const [draft, setDraft] = useState(() => String(value))
  const lastCommitted = useRef(value)

  // Adopt external changes (e.g. "Reset to defaults") without clobbering typing.
  useEffect(() => {
    if (value !== lastCommitted.current) {
      lastCommitted.current = value
      setDraft(String(value))
    }
  }, [value])

  const n = Number(draft)
  const valid = draft.trim() !== '' && Number.isFinite(n) && n >= min

  return (
    <input
      type="number"
      min={min}
      value={draft}
      aria-label={ariaLabel}
      aria-invalid={valid ? undefined : true}
      className={valid ? undefined : 'input--invalid'}
      title={valid ? undefined : `Enter a number of at least ${min}`}
      onWheel={(e) => e.currentTarget.blur()}
      onChange={(e) => {
        const raw = e.target.value
        setDraft(raw)
        const next = Number(raw)
        const ok = raw.trim() !== '' && Number.isFinite(next) && next >= min
        onValidityChange?.(ok)
        if (ok) {
          lastCommitted.current = next
          onCommit(next)
        }
      }}
    />
  )
}
