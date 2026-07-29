import type { ReactNode } from 'react'

interface ScreenShellProps {
  title: string
  intro?: string
  children?: ReactNode
}

/**
 * Common wrapper for a top-level screen: an <h2> title (also used as the
 * routing landmark in tests) plus optional intro text and content.
 */
export function ScreenShell({ title, intro, children }: ScreenShellProps) {
  return (
    <section className="screen" aria-labelledby="screen-title">
      <h2 id="screen-title" className="screen__title">
        {title}
      </h2>
      {intro && <p className="screen__intro">{intro}</p>}
      {children}
    </section>
  )
}
