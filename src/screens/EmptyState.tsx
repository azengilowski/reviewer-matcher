import { Link } from 'react-router-dom'

/** Compact empty-state: a small line-art illustration, one line of text, and
 *  an optional link to the step that unblocks it. */
export function EmptyState({
  art,
  text,
  ctaTo,
  ctaLabel,
}: {
  art: 'charts' | 'export'
  text: string
  ctaTo?: string
  ctaLabel?: string
}) {
  return (
    <div className="empty">
      {art === 'charts' ? <ChartsArt /> : <ExportArt />}
      <p className="empty__text">{text}</p>
      {ctaTo && ctaLabel && (
        <Link className="btn btn--ghost" to={ctaTo}>
          {ctaLabel}
        </Link>
      )}
    </div>
  )
}

/** Bars with a magnifier, for review screens awaiting a match. */
function ChartsArt() {
  return (
    <svg className="empty__art" viewBox="0 0 160 96" aria-hidden="true">
      <g fill="var(--surface)" stroke="var(--border)" strokeWidth="2">
        <rect x="24" y="14" width="112" height="68" rx="8" />
      </g>
      <g fill="var(--accent-weak)" stroke="var(--accent)" strokeWidth="2">
        <rect x="40" y="48" width="12" height="20" rx="2" />
        <rect x="60" y="36" width="12" height="32" rx="2" />
        <rect x="80" y="26" width="12" height="42" rx="2" />
      </g>
      <g fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round">
        <circle cx="112" cy="42" r="13" fill="var(--surface)" fillOpacity="0.85" />
        <path d="M122 52 L132 62" />
      </g>
    </svg>
  )
}

/** A file flying out of a tray, for the export screen awaiting data. */
function ExportArt() {
  return (
    <svg className="empty__art" viewBox="0 0 160 96" aria-hidden="true">
      <g fill="var(--surface)" stroke="var(--border)" strokeWidth="2">
        <path d="M36 56 h88 v20 a8 8 0 0 1 -8 8 h-72 a8 8 0 0 1 -8 -8 z" />
      </g>
      <g fill="var(--accent-weak)" stroke="var(--accent)" strokeWidth="2">
        <rect x="62" y="18" width="36" height="44" rx="4" />
      </g>
      <g fill="var(--accent)">
        <rect x="69" y="27" width="22" height="3" rx="1.5" />
        <rect x="69" y="35" width="22" height="3" rx="1.5" />
        <rect x="69" y="43" width="14" height="3" rx="1.5" />
      </g>
      <g fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M124 38 v-16 m0 0 l-7 7 m7 -7 l7 7" />
      </g>
    </svg>
  )
}
