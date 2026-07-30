import type { ReactNode } from 'react'

interface ScreenShellProps {
  title: string
  intro?: string
  /** Optional navigation rendered above the title (kept fixed so it doesn't
   *  shift when the title/intro below it change between sibling views). */
  nav?: ReactNode
  children?: ReactNode
}

/**
 * Common wrapper for a top-level screen: an <h2> title (also used as the
 * routing landmark in tests) plus optional intro text and content.
 */
export function ScreenShell({ title, intro, nav, children }: ScreenShellProps) {
  return (
    <section className="screen" aria-labelledby="screen-title">
      <div className="screen__head">
        <div className="screen__titlerow">
          <h2 id="screen-title" className="screen__title">
            {title}
          </h2>
          {nav && <div className="screen__nav">{nav}</div>}
        </div>
        {intro && <p className="screen__intro">{intro}</p>}
      </div>
      {children}
    </section>
  )
}
