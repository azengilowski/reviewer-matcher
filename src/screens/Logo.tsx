/** The brand wordmark: script "Peer" against the upright grotesk. */
export function Wordmark() {
  return (
    <span className="wordmark">
      <em>Peer</em>fect Match
    </span>
  )
}

/**
 * Peerfect Match mark: a "p" monogram whose bowl is a checkmark badge —
 * peer-reviewed and approved — on the wordmark's gradient.
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
      <rect x="150" y="112" width="58" height="292" rx="29" fill="#fff" />
      <circle cx="292" cy="224" r="114" fill="#fff" />
      <path
        d="M 236 228 L 276 268 L 352 178"
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth="38"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
