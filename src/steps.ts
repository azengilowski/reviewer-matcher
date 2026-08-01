/** The linear flow shown as the single header stepper + drives the Next buttons. */
export interface Step {
  to: string
  label: string
  /** Extra route prefixes that count as being "on" this step (e.g. Details ⊂ Review). */
  match?: string[]
}

export const STEPS: Step[] = [
  { to: '/upload', label: 'Upload' },
  { to: '/settings', label: 'Configure' },
  { to: '/match', label: 'Match' },
  { to: '/dashboard', label: 'Review', match: ['/dashboard', '/workload', '/details'] },
  { to: '/export', label: 'Export' },
]

/** Index of the step the given path belongs to (-1 if none). */
export function stepIndexFor(pathname: string): number {
  return STEPS.findIndex((s) => (s.match ?? [s.to]).some((m) => pathname.startsWith(m)))
}
