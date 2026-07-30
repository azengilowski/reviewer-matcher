/** The brand wordmark: italic "Peer", so the pun lands on sight. */
export function Wordmark() {
  return (
    <span className="wordmark">
      <em>Peer</em>fect Match
    </span>
  )
}

/** Peerfect Match mark: a heart stamped with an approval check. */
export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg
      className="logo"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      style={{ borderRadius: Math.max(4, Math.round(size * 0.22)) }}
      aria-hidden="true"
    >
      <rect width="512" height="512" rx="112" fill="var(--accent)" />
      <path
        d="M256 440 C 140 355 88 285 88 208 a 92 92 0 0 1 168 -52 a 92 92 0 0 1 168 52 c 0 77 -52 147 -168 232 z"
        fill="#fff"
      />
      <path
        d="M196 262 l 44 44 82 -84"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="36"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
