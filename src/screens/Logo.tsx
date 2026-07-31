/** The brand wordmark: script "Peer" against the upright grotesk. */
export function Wordmark() {
  return (
    <span className="wordmark">
      <em>Peer</em>fect Match
    </span>
  )
}

/**
 * The wordmark's own Pacifico capital "P", extracted to a path (fontkit, see
 * scripts note in the commit) so the favicon renders without the font.
 */
const PACIFICO_P =
  'M374.8 186.4Q374.8 212.4 361.3 234.1Q347.9 255.8 322.2 269.6Q296.5 283.4 261 285.8L247.9 359.5Q240.3 402 206.3 402Q187.7 402 171.9 391Q156.2 380 146.7 357.4Q137.2 334.7 137.2 301.7Q137.2 239.6 157.2 196.4Q177.3 153.1 211.1 131.6Q244.8 110 285.5 110Q314.2 110 334.3 120.1Q354.3 130.2 364.5 147.5Q374.8 164.7 374.8 186.4ZM266.5 254.3Q329.2 246.4 329.2 189.2Q329.2 169 315.9 156.3Q302.6 143.6 274.8 143.6Q243.3 143.6 219.9 163.5Q196.5 183.4 183.8 218.7Q171.2 254 171.2 299.3Q171.2 318.2 175 332.9Q178.8 347.6 184.8 355.7Q190.7 363.8 196.2 363.8Q203.9 363.8 207.8 342.7L217.9 284.9Q206 283.1 207.5 283.4Q198.4 281.8 195.6 277.7Q192.9 273.6 192.9 267.2Q192.9 260.4 196.7 256.5Q200.5 252.5 207.2 252.5Q210.3 252.5 211.8 252.8Q219.2 254 223.1 254.3Q227.1 230.5 234.4 190.4Q236.3 180 242.9 175.6Q249.4 171.2 258.3 171.2Q268.4 171.2 272.8 175Q277.3 178.8 277.3 187.1Q277.3 191.9 276.6 195L266.5 254.3Z'

/**
 * Peerfect Match mark: the script "P" from the wordmark with a check badge —
 * peer-reviewed and approved — on the brand gradient.
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
      <g transform="translate(256 236) scale(1.52) translate(-256 -256)">
        <path d={PACIFICO_P} fill="#fff" />
      </g>
      {/* Check badge; the outer gradient circle cuts a gap ring around it. */}
      <circle cx="374" cy="374" r="104" fill={`url(#${gid})`} />
      <circle cx="374" cy="374" r="86" fill="#fff" />
      <path
        d="M 334 376 L 364 406 L 418 340"
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth="28"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
