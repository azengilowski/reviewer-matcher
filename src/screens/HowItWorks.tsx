import { useEffect, useRef } from 'react'

/** Modal explaining privacy, embeddings, matching, and import/export. */
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
        aria-label="How Reviewer Matcher works"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__head">
          <strong>How Reviewer Matcher works</strong>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal__body prose" ref={bodyRef}>
          <section>
            <h4>🔒 Everything runs in your browser</h4>
            <p>
              There is no server. Your reviewer and paper data never leave your device — it is
              parsed, embedded, matched, and saved entirely inside this browser tab. The only
              network request is a one-time download of the matching model, which is then cached so
              the app keeps working offline.
            </p>
          </section>

          <section>
            <h4>1 · Turning text into meaning (embeddings)</h4>
            <p>
              For each reviewer we combine their specialties and criteria; for each paper, its
              title, abstract, keywords, and method. That text is run through a sentence-embedding
              model (all-MiniLM-L6-v2) that executes locally as WebAssembly, producing a numeric
              vector that captures its meaning. Two vectors pointing in a similar direction (high
              cosine similarity) mean the paper and reviewer are topically close. Embedding runs on
              a background thread so the interface stays responsive, with a progress bar on first
              run while the model downloads.
            </p>
          </section>

          <section>
            <h4>2 · Matching (stable marriage)</h4>
            <p>
              Every paper ranks the reviewers by similarity, and every reviewer ranks the papers. A
              many-to-many deferred-acceptance algorithm — a generalized Gale–Shapley{' '}
              <em>stable marriage</em> — then pairs them: each paper receives up to its capacity of
              reviewers and each reviewer up to their load of papers, and the result is stable, so
              no paper and reviewer would both rather be matched to each other than to who they got.
              Reviewers are never assigned to papers they authored (self-authorship conflicts are
              excluded). In Settings you can adjust capacities, per-role loads, which side proposes,
              a fairness floor, and the embedding model.
            </p>
          </section>

          <section>
            <h4>3 · Reviewing &amp; fine-tuning</h4>
            <p>
              The Match board lets you drag reviewers between papers, add or remove them, search,
              sort, and lock papers you have finalized (locked papers are preserved when you
              re-run). Every edit is undoable, and rejected drops explain themselves. The Details
              tab shows each paper's full ranked list and why each reviewer was or wasn't chosen;
              the Dashboard summarizes overall match quality.
            </p>
          </section>

          <section>
            <h4>Importing &amp; exporting</h4>
            <p>
              <strong>Import</strong> reviewers and papers from CSV or Excel. You map which columns
              hold the id, name, specialties, title, and so on, and preview the result before
              committing.
            </p>
            <p>
              <strong>Export</strong> the finished assignments as a CSV (papers as columns), a
              detailed per-paper report CSV, or a <code>.matchproj</code> project file that bundles
              everything — data, settings, the match, and your edits — so you can back it up or
              re-open it later exactly where you left off.
            </p>
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
