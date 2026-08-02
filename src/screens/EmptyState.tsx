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

/** A paper and a reviewer waiting to be matched — dashed arc, brand heart. */
function ChartsArt() {
  return (
    <svg className="empty__art" viewBox="0 0 160 96" aria-hidden="true">
      <defs>
        <linearGradient id="empty-heart-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
      </defs>
      {/* Paper card */}
      <g fill="var(--surface)" stroke="var(--accent)" strokeWidth="2">
        <path d="M22 30 h30 l10 10 v30 a4 4 0 0 1 -4 4 h-36 a4 4 0 0 1 -4 -4 v-36 a4 4 0 0 1 4 -4 z" />
        <path d="M52 30 l10 10 h-10 z" fill="var(--accent-weak)" />
      </g>
      <g fill="var(--accent-weak)">
        <rect x="26" y="48" width="28" height="3.5" rx="1.75" />
        <rect x="26" y="56" width="28" height="3.5" rx="1.75" />
        <rect x="26" y="64" width="17" height="3.5" rx="1.75" />
      </g>
      {/* Reviewer card */}
      <g fill="var(--surface)" stroke="var(--accent)" strokeWidth="2">
        <rect x="98" y="30" width="44" height="44" rx="6" />
      </g>
      <circle cx="120" cy="45" r="7.5" fill="var(--accent-weak)" stroke="var(--accent)" strokeWidth="2" />
      <path
        d="M108 68 a12 12 0 0 1 24 0"
        fill="var(--accent-weak)"
        stroke="var(--accent)"
        strokeWidth="2"
      />
      {/* Dashed match arc, with the brand heart at its apex */}
      <path
        d="M62 34 C 68 22, 92 22, 98 34"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="1 6"
      />
      <path
        d="M80 26 C 74.5 21.5 71 18.6 71 15.2 C 71 12.4 73.1 10.5 75.6 10.5 C 77.4 10.5 79 11.6 80 13.3 C 81 11.6 82.6 10.5 84.4 10.5 C 86.9 10.5 89 12.4 89 15.2 C 89 18.6 85.5 21.5 80 26 Z"
        fill="url(#empty-heart-grad)"
      />
    </svg>
  )
}

/** The ribbon-wrapped manuscript lifting out of a tray, ready to hand off. */
function ExportArt() {
  return (
    <svg className="empty__art" viewBox="0 0 160 96" aria-hidden="true">
      {/* Tray */}
      <g fill="var(--surface)" stroke="var(--border)" strokeWidth="2">
        <path d="M36 58 h88 v18 a8 8 0 0 1 -8 8 h-72 a8 8 0 0 1 -8 -8 z" />
      </g>
      {/* Manuscript with folded corner, wrapped in the brand ribbon */}
      <g fill="var(--surface)" stroke="var(--accent)" strokeWidth="2">
        <path d="M62 14 h26 l10 10 v38 h-36 z" />
        <path d="M88 14 l10 10 h-10 z" fill="var(--accent-weak)" />
      </g>
      <g fill="var(--accent-weak)">
        <rect x="68" y="22" width="14" height="3" rx="1.5" />
        <rect x="68" y="29" width="24" height="3" rx="1.5" />
      </g>
      {/* The brand ribbon band — the logo's manuscript, in miniature. */}
      <g fill="#8b3ec8">
        <rect x="62" y="40" width="36" height="8" />
      </g>
      {/* Lift-off arrow + motion ticks */}
      <g fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M116 38 v-16 m0 0 l-7 7 m7 -7 l7 7" />
      </g>
      <g stroke="var(--accent-weak)" strokeWidth="3" strokeLinecap="round">
        <path d="M48 34 v-8" />
        <path d="M42 44 v-5" />
      </g>
    </svg>
  )
}
