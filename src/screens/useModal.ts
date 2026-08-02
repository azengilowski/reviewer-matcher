import { useEffect, useRef } from 'react'

const FOCUSABLE =
  'button, [href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])'

/**
 * Keyboard behavior every modal should have: Escape closes, Tab cycles inside
 * (focus trap), and focus moves into the dialog on open. Attach the returned
 * ref to the modal's container element.
 */
export function useModalKeys<T extends HTMLElement = HTMLDivElement>(onClose: () => void) {
  // Track the latest close callback without re-running the effect (consumers
  // pass fresh inline closures on every render).
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const focusables = () =>
      [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((f) => !f.hasAttribute('disabled'))

    // Move focus inside: prefer the first control that isn't the ✕ button.
    const prior = document.activeElement as HTMLElement | null
    const items = focusables()
    const first = items.find((f) => !f.classList.contains('modal__close')) ?? items[0]
    first?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        closeRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const list = focusables()
      if (list.length === 0) return
      const firstEl = list[0]
      const lastEl = list[list.length - 1]
      const active = document.activeElement
      if (active && !el.contains(active)) {
        e.preventDefault()
        firstEl.focus()
      } else if (e.shiftKey && active === firstEl) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      // Hand focus back to wherever the user was before the modal opened.
      prior?.focus?.()
    }
  }, [])

  return ref
}
