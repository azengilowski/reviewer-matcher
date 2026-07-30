/** Flat, solid-fill icons used inline in prose and notices. */

/** Closed padlock: the privacy / local-only marker. */
export function LockIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      className="icon icon--lock"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2a5 5 0 0 0-5 5v2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm0 2a3 3 0 0 1 3 3v2H9V7a3 3 0 0 1 3-3zm0 10a1.75 1.75 0 0 1 1 3.2V19a1 1 0 0 1-2 0v-1.8a1.75 1.75 0 0 1 1-3.2z" />
    </svg>
  )
}

/** Filled warning triangle. */
export function WarningIcon({ size = 15 }: { size?: number }) {
  return (
    <svg
      className="icon icon--warn"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 3a1.7 1.7 0 0 1 1.47.85l8.3 14.4A1.7 1.7 0 0 1 20.3 21H3.7a1.7 1.7 0 0 1-1.47-2.75l8.3-14.4A1.7 1.7 0 0 1 12 3zm0 4.75a1 1 0 0 0-1 1v4.5a1 1 0 0 0 2 0v-4.5a1 1 0 0 0-1-1zm0 8a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5z" />
    </svg>
  )
}
