/** The brand wordmark: script "Peer" against the upright grotesk. */
export function Wordmark() {
  return (
    <span className="wordmark">
      <em>Peer</em>fect Match
    </span>
  )
}

/** Nearly fills the 512 box, with a shallow cleft so the mark reads bold. */
const HEART =
  'M256 500 C 130 406 12 316 12 196 C 12 130 64 84 128 84 C 184 84 226 106 256 148 C 286 106 328 84 384 84 C 448 84 500 130 500 196 C 500 316 382 406 256 500 Z'

/** The manuscript tied with a ribbon bow (shared by both container shapes). */
function Manuscript() {
  return (
    <>
      {/* Manuscript with a folded top-right corner */}
      <path
        d="M 150 130 h 158 l 54 54 v 210 a 18 18 0 0 1 -18 18 h -176 a 18 18 0 0 1 -18 -18 v -246 a 18 18 0 0 1 18 -18 z"
        fill="#fff"
      />
      <path d="M 308 130 l 54 54 h -54 z" fill="#d6dbf0" />
      {/* Text lines */}
      <g fill="#cbd2ec">
        <rect x="178" y="152" width="150" height="9" rx="4.5" />
        <rect x="178" y="174" width="150" height="9" rx="4.5" />
        <rect x="178" y="196" width="82" height="9" rx="4.5" />
      </g>
      {/* Ribbon band at the paper's midpoint */}
      <rect x="150" y="256" width="212" height="30" fill="#8b3ec8" />
      {/* Bow, sitting just above the band */}
      <g fill="#8b3ec8" transform="translate(256 267) scale(0.46) translate(-256 -256)">
        <path d="M 256 256 L 150 190 Q 118 218 118 256 Q 118 294 150 322 Z" />
        <path d="M 256 256 L 362 190 Q 394 218 394 256 Q 394 294 362 322 Z" />
        <path d="M 238 262 L 196 372 L 224 350 L 236 384 L 252 300 Z" />
        <path d="M 274 262 L 316 372 L 288 350 L 276 384 L 260 300 Z" />
        <rect x="228" y="224" width="56" height="64" rx="16" />
      </g>
    </>
  )
}

/**
 * Peerfect Match mark: a manuscript tied with a ribbon bow — the perfect
 * match, wrapped up. The background runs blue → red (the two sides); the
 * ribbon + bow are a single flat purple — where the two meet in the middle.
 *
 * `heart` swaps the rounded-square container for a heart — only used large
 * (e.g. the home hero); the square reads better at header/favicon sizes.
 */
export function Logo({ size = 22, heart = false }: { size?: number; heart?: boolean }) {
  // Unique gradient id per size + shape so multiple logos can coexist on a page.
  const gid = `logo-grad-${size}${heart ? '-h' : ''}`
  return (
    <svg
      className="logo"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      style={{ borderRadius: heart ? 0 : Math.max(4, Math.round(size * 0.22)) }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
      </defs>
      {heart ? (
        <>
          <path d={HEART} fill={`url(#${gid})`} />
          {/* Manuscript scaled and seated well below the cleft, inside the taper. */}
          <g transform="translate(256 290) scale(0.74) translate(-256 -271)">
            <Manuscript />
          </g>
        </>
      ) : (
        <>
          <rect width="512" height="512" rx="112" fill={`url(#${gid})`} />
          {/* Shift the manuscript up so its box is vertically centred. */}
          <g transform="translate(0 -15)">
            <Manuscript />
          </g>
        </>
      )}
    </svg>
  )
}
