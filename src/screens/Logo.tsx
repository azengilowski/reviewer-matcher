/** The brand wordmark: script "Peer" against the upright grotesk. */
export function Wordmark() {
  return (
    <span className="wordmark">
      <em>Peer</em>fect Match
    </span>
  )
}

/**
 * Peerfect Match mark: a double check — peer review is double-checking — the
 * first knocked back, the second landing solid, on the brand gradient.
 */
export function Logo({ size = 22 }: { size?: number }) {
  // Unique gradient id per size so multiple logos can coexist on one page.
  const gid = `logo-grad-${size}`
  return (
    <svg
      className="logo"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      style={{ borderRadius: Math.max(4, Math.round(size * 0.22)) }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2f5fe0" />
          <stop offset="55%" stopColor="#7a4de8" />
          <stop offset="100%" stopColor="#e0457b" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill={`url(#${gid})`} />
      <g fill="none" stroke="#fff" strokeWidth="52" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 108 268 L 188 348 L 330 180" opacity="0.45" />
        <path d="M 212 268 L 292 348 L 434 180" />
      </g>
    </svg>
  )
}
