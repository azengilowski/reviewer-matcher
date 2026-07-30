/** The brand wordmark: script "Peer" against the upright grotesk. */
export function Wordmark() {
  return (
    <span className="wordmark">
      <em>Peer</em>fect Match
    </span>
  )
}

/**
 * Peerfect Match mark: two overlapping rings whose shared lens is the match,
 * on the same blue-to-pink gradient as the wordmark.
 */
export function Logo({ size = 22 }: { size?: number }) {
  // Unique ids per size so multiple logos can coexist on one page.
  const gid = `logo-grad-${size}`
  const cid = `logo-clip-${size}`
  const mid = `logo-mask-${size}`
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
        {/* Two solid lobes with their shared lens knocked out, so the overlap
            reads as the match. Solid shapes stay legible at favicon sizes. */}
        <clipPath id={cid}>
          <circle cx="198" cy="256" r="104" />
        </clipPath>
        <mask id={mid}>
          <circle cx="198" cy="256" r="104" fill="#fff" />
          <circle cx="314" cy="256" r="104" fill="#fff" />
          <g clipPath={`url(#${cid})`}>
            <circle cx="314" cy="256" r="104" fill="#000" />
          </g>
        </mask>
      </defs>
      <rect width="512" height="512" rx="112" fill={`url(#${gid})`} />
      <rect width="512" height="512" fill="#fff" mask={`url(#${mid})`} />
    </svg>
  )
}
