import { useEffect, useRef } from 'react'
import { Wordmark } from './Logo'

/** Modal explaining privacy, embeddings, matching, and import/export,
 *  in plain language, with a small diagram for each idea. */
export function HowItWorksModal({ onClose }: { onClose: () => void }) {
  const bodyRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0 // always open at the top
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal modal--wide"
        role="dialog"
        aria-modal="true"
        aria-label="How Peerfect Match works"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__head">
          <strong>
            How <Wordmark /> works
          </strong>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal__body prose" ref={bodyRef}>
          <p className="prose__lead">
            Here's the whole thing in plain language, no jargon required. It takes about two minutes
            to read.
          </p>

          <section>
            <h4>🔒 It all happens on your computer</h4>
            <p>
              Good news first: there's no server, no sign-up, and nothing to upload. Your reviewers
              and papers stay right here in this browser tab, where we read them, do the matching,
              and save your work all on your own machine. The one time the app reaches out to the
              internet is to grab the matching model on your first visit. After that it's tucked away
              for reuse, and everything keeps working even offline.
            </p>
            <figure className="prose__figure">
              <LocalDiagram />
              <figcaption>Your data never leaves this tab, so there's nothing to upload.</figcaption>
            </figure>
          </section>

          <section>
            <h4>1 · Understanding what everything is about</h4>
            <p>
              Before it can match anyone, the app needs a feel for the topics involved. It reads each
              reviewer's specialties and each paper's title, abstract, keywords, and method, and
              turns that text into a point on a giant “map of ideas.” Papers and reviewers that land
              near each other are about similar things, so they're likely a good fit. This quiet
              bit of number-crunching happens in the background, so the app stays snappy while it
              works.
            </p>
            <figure className="prose__figure">
              <EmbedDiagram />
              <figcaption>Similar topics end up close together on the map.</figcaption>
            </figure>
          </section>

          <section>
            <h4>2 · Finding fair pairs</h4>
            <p>
              Now the app plays matchmaker. Every paper has a wish-list of reviewers (closest topics
              first), and every reviewer has a wish-list of papers. It works through those lists to
              pair everyone up as well as possible, filling each paper up to its reviewer limit and
              keeping each reviewer's workload sensible. The result is <em>stable</em>: there's no
              paper-and-reviewer pair who'd both secretly rather have been matched with each other.
              And nobody is ever handed their own paper to review. You hold the dials: capacities,
              workloads, and more all live in the Configure step.
            </p>
            <figure className="prose__figure">
              <MatchDiagram />
              <figcaption>
                Each paper gets the reviewers nearest the top of its list, never its own authors.
              </figcaption>
            </figure>
            <p className="prose__aside">
              For the curious: this is the{' '}
              <a
                href="https://en.wikipedia.org/wiki/Stable_marriage_problem"
                target="_blank"
                rel="noopener noreferrer"
              >
                stable-marriage algorithm
              </a>{' '}
              (a many-to-many “deferred acceptance” version of Gale-Shapley).
            </p>
          </section>

          <section>
            <h4>3 · Make it your own</h4>
            <p>
              The match is a starting point, not the final word. On the Match board you can drag a
              reviewer from one paper to another, add or remove people, and search or sort to find
              exactly what you need. Happy with a paper? Lock it, and it stays put even if you re-run
              the match. Changed your mind? Every edit can be undone. Curious about the reasoning? The
              Review tab shows each paper's full ranked list and explains why each reviewer did or
              didn't make the cut.
            </p>
            <figure className="prose__figure">
              <TuneDiagram />
              <figcaption>Drag to adjust, lock what you like, and undo anything.</figcaption>
            </figure>
          </section>

          <section>
            <h4>Getting your data in and out</h4>
            <p>
              Bring your reviewers and papers in from a CSV or Excel file. You just tell the app
              which column is which, and preview everything before it's imported. When you're done,
              take your work with you: export the assignments as a spreadsheet, a detailed per-paper
              report, or a single <code>.matchproj</code> file that saves <em>everything</em> (data,
              settings, the match, and your tweaks) so you can reopen it later right where you left
              off.
            </p>
            <figure className="prose__figure">
              <IoDiagram />
              <figcaption>In from CSV or Excel; out as spreadsheets or a re-openable project.</figcaption>
            </figure>
          </section>
        </div>

        <div className="modal__foot">
          <button className="btn" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}

const GREEN = '#1a7f37'
const RED = '#c0392b'

/** A right-pointing arrow (line + solid head) between two x positions. */
function RightArrow({ x1, x2, y, color = 'var(--accent)' }: { x1: number; x2: number; y: number; color?: string }) {
  return (
    <g stroke={color} fill={color}>
      <line x1={x1} y1={y} x2={x2 - 6} y2={y} strokeWidth="2" />
      <polygon points={`${x2},${y} ${x2 - 8},${y - 4.5} ${x2 - 8},${y + 4.5}`} stroke="none" />
    </g>
  )
}

/** Everything stays inside the browser tab; there is no server. */
function LocalDiagram() {
  return (
    <svg
      className="prose__svg"
      viewBox="0 0 520 150"
      role="img"
      aria-label="Your data, the matching model, and your results all stay inside this browser tab. There is no server to upload to."
    >
      {/* browser window */}
      <rect x="16" y="20" width="300" height="114" rx="12" fill="var(--surface)" stroke="var(--border)" strokeWidth="2" />
      <path d="M16 36 v-4 a12 12 0 0 1 12 -12 h276 a12 12 0 0 1 12 12 v4 z" fill="var(--bg)" />
      <circle cx="32" cy="28" r="3" fill="var(--border)" />
      <circle cx="44" cy="28" r="3" fill="var(--border)" />
      <circle cx="56" cy="28" r="3" fill="var(--border)" />
      <text x="168" y="32" textAnchor="middle" fontSize="11" fill="var(--muted)">This browser tab</text>
      {/* contents */}
      <g fontSize="12" fontWeight="600">
        <rect x="40" y="50" width="252" height="24" rx="12" fill="var(--accent-weak)" />
        <text x="54" y="66" fill="var(--accent)">Your reviewers &amp; papers</text>
        <rect x="40" y="82" width="252" height="24" rx="12" fill="#e7f4ed" />
        <text x="54" y="98" fill={GREEN}>The matching model</text>
        <rect x="40" y="114" width="252" height="14" rx="7" fill="var(--bg)" />
      </g>
      {/* blocked connection */}
      <line x1="322" y1="76" x2="372" y2="76" stroke="var(--border)" strokeWidth="2" strokeDasharray="4 4" />
      <g stroke={RED} strokeWidth="2.5" strokeLinecap="round">
        <line x1="341" y1="70" x2="353" y2="82" />
        <line x1="353" y1="70" x2="341" y2="82" />
      </g>
      {/* server, crossed out */}
      <rect x="392" y="50" width="98" height="22" rx="5" fill="var(--surface)" stroke="var(--border)" strokeWidth="2" />
      <circle cx="403" cy="61" r="3" fill="var(--muted)" />
      <rect x="411" y="59" width="62" height="4" rx="2" fill="var(--border)" />
      <rect x="392" y="78" width="98" height="22" rx="5" fill="var(--surface)" stroke="var(--border)" strokeWidth="2" />
      <circle cx="403" cy="89" r="3" fill="var(--muted)" />
      <rect x="411" y="87" width="62" height="4" rx="2" fill="var(--border)" />
      <line x1="388" y1="104" x2="494" y2="46" stroke={RED} strokeWidth="3" strokeLinecap="round" />
      <text x="441" y="122" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--muted)">No server</text>
    </svg>
  )
}

/** Text becomes a point on a topic map; nearby points are a good match. */
function EmbedDiagram() {
  return (
    <svg
      className="prose__svg"
      viewBox="0 0 520 158"
      role="img"
      aria-label="A paper's and a reviewer's text each become a point on a topic map. Points that sit close together are a good match."
    >
      {/* paper card */}
      <rect x="14" y="28" width="150" height="44" rx="8" fill="var(--surface)" stroke="var(--border)" strokeWidth="2" />
      <text x="26" y="48" fontSize="12" fontWeight="700" fill="var(--text)">Paper</text>
      <text x="26" y="63" fontSize="9.5" fill="var(--muted)">title · abstract · keywords</text>
      {/* reviewer card */}
      <rect x="14" y="86" width="150" height="44" rx="8" fill="var(--surface)" stroke="var(--border)" strokeWidth="2" />
      <text x="26" y="106" fontSize="12" fontWeight="700" fill="var(--text)">Reviewer</text>
      <text x="26" y="121" fontSize="9.5" fill="var(--muted)">specialties · criteria</text>
      {/* becomes a point */}
      <text x="209" y="63" textAnchor="middle" fontSize="9.5" fill="var(--muted)">becomes</text>
      <text x="209" y="75" textAnchor="middle" fontSize="9.5" fill="var(--muted)">a point</text>
      <RightArrow x1={172} x2={246} y={90} />
      {/* topic map */}
      <rect x="256" y="28" width="250" height="102" rx="10" fill="var(--bg)" stroke="var(--border)" strokeWidth="2" />
      <text x="267" y="44" fontSize="9.5" fill="var(--muted)">map of ideas</text>
      <circle cx="474" cy="108" r="6" fill="var(--muted)" opacity="0.45" />
      <text x="474" y="124" textAnchor="middle" fontSize="9" fill="var(--muted)">unrelated</text>
      <line x1="320" y1="72" x2="352" y2="92" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="3 3" />
      <text x="404" y="70" textAnchor="middle" fontSize="9.5" fontWeight="600" fill="var(--muted)">close = good match</text>
      <circle cx="320" cy="72" r="7" fill="var(--accent)" />
      <text x="320" y="63" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--accent)">Paper</text>
      <circle cx="352" cy="92" r="7" fill={GREEN} />
      <text x="362" y="108" fontSize="10" fontWeight="700" fill={GREEN}>Reviewer</text>
    </svg>
  )
}

/** Papers and reviewers paired up by preference. */
function MatchDiagram() {
  const link = (x1: number, y1: number, x2: number, y2: number) => (
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--accent)" strokeWidth="2" opacity="0.55" />
  )
  return (
    <svg
      className="prose__svg"
      viewBox="0 0 520 170"
      role="img"
      aria-label="Papers on the left are joined to reviewers on the right. One paper can take two reviewers, up to its capacity."
    >
      <text x="95" y="22" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--muted)">Papers</text>
      <text x="426" y="22" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--muted)">Reviewers</text>
      {/* connections (under the boxes) */}
      {link(150, 54, 372, 52)}
      {link(150, 54, 372, 112)}
      {link(150, 100, 372, 82)}
      {link(150, 146, 372, 142)}
      {/* papers */}
      <g fontSize="11" fontWeight="600">
        <rect x="40" y="40" width="110" height="28" rx="6" fill="var(--surface)" stroke="var(--border)" strokeWidth="2" />
        <text x="52" y="58" fill="var(--text)">P1 · Reading</text>
        <rect x="40" y="86" width="110" height="28" rx="6" fill="var(--surface)" stroke="var(--border)" strokeWidth="2" />
        <text x="52" y="104" fill="var(--text)">P2 · Math</text>
        <rect x="40" y="132" width="110" height="28" rx="6" fill="var(--surface)" stroke="var(--border)" strokeWidth="2" />
        <text x="52" y="150" fill="var(--text)">P3 · Data</text>
      </g>
      {/* reviewers */}
      <g fontSize="11" fontWeight="600">
        <rect x="372" y="40" width="108" height="24" rx="12" fill="var(--accent-weak)" />
        <text x="426" y="56" textAnchor="middle" fill="var(--accent)">Vega</text>
        <rect x="372" y="70" width="108" height="24" rx="12" fill="var(--accent-weak)" />
        <text x="426" y="86" textAnchor="middle" fill="var(--accent)">Ibarra</text>
        <rect x="372" y="100" width="108" height="24" rx="12" fill="var(--accent-weak)" />
        <text x="426" y="116" textAnchor="middle" fill="var(--accent)">Frost</text>
        <rect x="372" y="130" width="108" height="24" rx="12" fill="var(--accent-weak)" />
        <text x="426" y="146" textAnchor="middle" fill="var(--accent)">Marsh</text>
      </g>
    </svg>
  )
}

/** Dragging a reviewer between papers; one paper locked. */
function TuneDiagram() {
  const chip = (x: number, y: number, label: string) => (
    <g>
      <rect x={x} y={y} width="140" height="24" rx="12" fill="var(--accent-weak)" />
      <text x={x + 14} y={y + 16} fontSize="11" fontWeight="600" fill="var(--accent)">
        {label}
      </text>
    </g>
  )
  return (
    <svg
      className="prose__svg"
      viewBox="0 0 520 156"
      role="img"
      aria-label="A reviewer chip is dragged from Paper A toward Paper B, which is locked."
    >
      {/* Column A */}
      <rect x="20" y="24" width="176" height="120" rx="10" fill="var(--bg)" stroke="var(--border)" strokeWidth="2" />
      <text x="38" y="46" fontSize="11" fontWeight="700" fill="var(--text)">Paper A</text>
      {chip(38, 56, 'Vega')}
      <rect x="38" y="88" width="140" height="24" rx="12" fill="none" stroke="var(--border)" strokeWidth="2" strokeDasharray="4 4" />
      {/* Column B, locked */}
      <rect x="324" y="24" width="176" height="120" rx="10" fill="var(--bg)" stroke="var(--border)" strokeWidth="2" />
      <g transform="translate(342,36)">
        <rect x="0" y="6" width="13" height="10" rx="2" fill="var(--muted)" />
        <path d="M2.5 6 v-2 a4 4 0 0 1 8 0 v2" fill="none" stroke="var(--muted)" strokeWidth="2" />
      </g>
      <text x="362" y="46" fontSize="11" fontWeight="700" fill="var(--text)">Paper B</text>
      {chip(342, 56, 'Ibarra')}
      {/* drag arrow + floating chip */}
      <path d="M196 96 Q260 60 316 76" fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray="5 4" />
      <polygon points="316,76 307,73 309,82" fill="var(--accent)" />
      <g>
        <rect x="205" y="52" width="112" height="26" rx="13" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2" />
        <text x="261" y="69" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--accent)">Marsh</text>
      </g>
    </svg>
  )
}

/** Files in from CSV/Excel; files out to spreadsheets or a project file. */
function IoDiagram() {
  const inFile = (y: number, label: string) => (
    <g>
      <rect x="24" y={y} width="72" height="26" rx="6" fill="var(--surface)" stroke="var(--border)" strokeWidth="2" />
      <text x="60" y={y + 17} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--text)">
        {label}
      </text>
    </g>
  )
  const outFile = (y: number, label: string) => (
    <g>
      <rect x="368" y={y} width="128" height="24" rx="6" fill="var(--surface)" stroke="var(--border)" strokeWidth="2" />
      <text x="382" y={y + 16} fontSize="10.5" fontWeight="600" fill="var(--text)">
        {label}
      </text>
    </g>
  )
  return (
    <svg
      className="prose__svg"
      viewBox="0 0 520 150"
      role="img"
      aria-label="CSV and Excel files flow into Peerfect Match; assignments, a report, and a project file flow out."
    >
      {/* app */}
      <rect x="196" y="42" width="128" height="66" rx="12" fill="var(--accent)" />
      <text x="260" y="72" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">Peerfect</text>
      <text x="260" y="90" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">Match</text>
      {/* in */}
      {inFile(40, 'CSV')}
      {inFile(84, 'Excel')}
      <RightArrow x1={100} x2={194} y={75} color="var(--muted)" />
      {/* out */}
      <RightArrow x1={326} x2={366} y={54} color="var(--muted)" />
      <RightArrow x1={326} x2={366} y={78} color="var(--muted)" />
      <RightArrow x1={326} x2={366} y={102} color="var(--muted)" />
      {outFile(42, 'assignments.csv')}
      {outFile(66, 'report.csv')}
      {outFile(90, 'project.matchproj')}
    </svg>
  )
}
