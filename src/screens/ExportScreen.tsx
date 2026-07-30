import { downloadText } from '../io/download'
import { exportResultsCsv } from '../io/exportResults'
import { exportReportCsv } from '../io/reportExport'
import { serializeProject } from '../io/project'
import { useApp } from '../state/AppStore'
import { EmptyState } from './EmptyState'
import { ScreenShell } from './ScreenShell'

export function ExportScreen() {
  const { reviewers, papers, settings, run, assignments, lockedPapers, auditLog, runHistory } =
    useApp()
  const hasData = reviewers.length > 0 || papers.length > 0
  const hasRun = run != null

  function exportProject() {
    const json = serializeProject({
      reviewers,
      papers,
      settings,
      run,
      assignments,
      lockedPapers,
      auditLog,
      runHistory,
    })
    downloadText('reviewer-match.matchproj', json, 'application/json')
  }
  function exportResults() {
    downloadText('reviewer-assignments.csv', exportResultsCsv(assignments, papers, reviewers))
  }
  function exportReport() {
    if (run) {
      downloadText(
        'reviewer-match-report.csv',
        exportReportCsv(run, assignments, reviewers, papers, settings),
      )
    }
  }

  return (
    <ScreenShell
      title="Export"
      intro="Take your work out of the app. Everything is generated in your browser, nothing is uploaded."
    >
      {!hasData && (
        <EmptyState
          art="export"
          text="Nothing to export yet. Import data and run a match, then collect your files here."
          ctaTo="/upload"
          ctaLabel="Go to Upload"
        />
      )}
      {hasData && !hasRun && (
        <p className="muted">Run a match first to export results and reports.</p>
      )}

      {hasData && (
      <div className="export-grid">
        <ExportCard
          title="Project file (.matchproj)"
          desc="A complete, re-openable backup: reviewers, papers, settings, the match, and every edit. Re-import it on the Upload step to pick up exactly where you left off."
          buttonLabel="Export .matchproj"
          onClick={exportProject}
          disabled={!hasData}
        />
        <ExportCard
          title="Results CSV"
          desc="The assignments as a spreadsheet: one column per paper, assigned reviewer names stacked down each column."
          buttonLabel="Export results CSV"
          onClick={exportResults}
          disabled={!hasRun}
        />
        <ExportCard
          title="Per-paper report CSV"
          desc="A detailed report: for every paper, each ranked reviewer with their similarity score and whether (and why) they were chosen."
          buttonLabel="Export report CSV"
          onClick={exportReport}
          disabled={!hasRun}
        />
      </div>
      )}
    </ScreenShell>
  )
}

function ExportCard({
  title,
  desc,
  buttonLabel,
  onClick,
  disabled,
}: {
  title: string
  desc: string
  buttonLabel: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <div className="export-card">
      <strong>{title}</strong>
      <p className="export-card__desc">{desc}</p>
      <button className="btn" onClick={onClick} disabled={disabled}>
        {buttonLabel}
      </button>
    </div>
  )
}
