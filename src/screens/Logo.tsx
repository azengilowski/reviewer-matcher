/** The app's network mark (papers linked to reviewers), reusable at any size. */
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
      <g fill="none" stroke="#fff" strokeWidth="34" strokeLinecap="round">
        <circle cx="168" cy="150" r="46" />
        <circle cx="168" cy="362" r="46" />
        <circle cx="344" cy="256" r="46" />
        <path d="M168 196 v120" />
        <path d="M206 172 L306 236" />
        <path d="M206 340 L306 276" />
      </g>
    </svg>
  )
}
