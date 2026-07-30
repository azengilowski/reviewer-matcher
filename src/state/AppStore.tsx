import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { DEFAULT_SETTINGS } from '../domain/settings'
import type {
  Assignment,
  AuditEntry,
  MatchRun,
  MatchSettings,
  Paper,
  Reviewer,
  RunSummary,
} from '../domain/types'
import { meanPaperRank } from '../analytics/stats'
import type { ProgressUpdate } from '../similarity/types'
import { idbGet, idbSet } from '../io/idb'
import type { ProjectFile } from '../io/project'
import { workerRunner, type MatchRunner } from '../matching/runner'

const PERSIST_KEY = 'state'

export type MatchStatus = 'idle' | 'running' | 'done' | 'error'

interface AppState {
  reviewers: Reviewer[]
  papers: Paper[]
  settings: MatchSettings
  run: MatchRun | null
  /** Current, possibly hand-edited assignments (initialized from run). */
  assignments: Assignment[]
  /** Paper ids that are locked (protected from edits, preserved on re-run). */
  lockedPapers: string[]
  runHistory: RunSummary[]
  auditLog: AuditEntry[]
  canUndo: boolean
  canRedo: boolean
  status: MatchStatus
  error: string | null
  progress: ProgressUpdate | null
  /** True while a settings field holds an empty/invalid draft (blocks Next: Match). */
  settingsInvalid: boolean
  /** True when the bundled sample is the most recently loaded data. */
  sampleLoaded: boolean
  /** Bumped by resetApp so screens with local UI state remount fresh. */
  resetEpoch: number
}

interface AppActions {
  setReviewers: (reviewers: Reviewer[]) => void
  setPapers: (papers: Paper[]) => void
  setSettings: (settings: MatchSettings) => void
  runMatching: () => Promise<void>
  /** Replace assignments and record an audit entry (undoable). */
  commitAssignments: (next: Assignment[], action: string, detail: string) => void
  undo: () => void
  redo: () => void
  /** Lock or unlock a paper (protect from edits + preserve on re-run). */
  toggleLock: (paperId: string) => void
  /** Restore full state from an imported project file (SPEC §5.8). */
  loadProject: (project: ProjectFile) => void
  setSettingsInvalid: (invalid: boolean) => void
  setSampleLoaded: (loaded: boolean) => void
  /** Wipe everything back to a fresh install: data, match, settings, history. */
  resetApp: () => void
}

const AppContext = createContext<(AppState & AppActions) | null>(null)

interface ProviderProps {
  children: ReactNode
  /** Injectable for tests; defaults to the embeddings Web Worker (SPEC §9). */
  runner?: MatchRunner
}

export function AppStoreProvider({ children, runner = workerRunner }: ProviderProps) {
  const [reviewers, setReviewers] = useState<Reviewer[]>([])
  const [papers, setPapers] = useState<Paper[]>([])
  const [settings, setSettings] = useState<MatchSettings>(DEFAULT_SETTINGS)
  const [run, setRun] = useState<MatchRun | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [lockedPapers, setLockedPapers] = useState<string[]>([])
  const [runHistory, setRunHistory] = useState<RunSummary[]>([])
  const [past, setPast] = useState<Assignment[][]>([])
  const [future, setFuture] = useState<Assignment[][]>([])
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [status, setStatus] = useState<MatchStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<ProgressUpdate | null>(null)
  const [settingsInvalid, setSettingsInvalid] = useState(false)
  const [sampleLoaded, setSampleLoaded] = useState(false)
  const [resetEpoch, setResetEpoch] = useState(0)

  // Uploading new data invalidates any existing run.
  const setReviewersAction = useCallback((next: Reviewer[]) => {
    setReviewers(next)
    setRun(null)
    setStatus('idle')
  }, [])
  const setPapersAction = useCallback((next: Paper[]) => {
    setPapers(next)
    setRun(null)
    setStatus('idle')
  }, [])

  const runMatching = useCallback(async () => {
    if (reviewers.length === 0 || papers.length === 0) {
      setError('Upload both reviewers and papers before running a match.')
      setStatus('error')
      return
    }
    setStatus('running')
    setError(null)
    setProgress({ phase: 'download', loaded: 0, total: 0 })
    try {
      // Preserve current assignments on locked papers across the re-run.
      const lockedAssignments = assignments.filter((a) => lockedPapers.includes(a.paperId))
      const result = await runner(
        reviewers,
        papers,
        settings,
        (update) => setProgress(update),
        lockedAssignments,
      )
      setRun(result)
      setAssignments(result.assignments)
      setPast([])
      setFuture([])
      setAuditLog([])
      setRunHistory((h) => [
        {
          at: Date.now(),
          paperCapacity: settings.paperCapacity,
          proposingSide: settings.proposingSide,
          seed: settings.seed,
          assignments: result.assignments.length,
          meanPaperRank: meanPaperRank(result.assignments),
          unfilledPapers: result.unmatchedPapers.length,
          stable: result.stable,
        },
        ...h,
      ])
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStatus('error')
    } finally {
      setProgress(null)
    }
  }, [reviewers, papers, settings, runner, assignments, lockedPapers])

  const commitAssignments = useCallback(
    (next: Assignment[], action: string, detail: string) => {
      setPast((p) => [...p, assignments])
      setFuture([])
      setAssignments(next)
      setAuditLog((log) => [{ at: Date.now(), action, detail }, ...log])
    },
    [assignments],
  )

  // Flat updates (no setState nested inside another updater) so StrictMode's
  // double-invocation of updaters can't append the audit entry twice.
  const undo = useCallback(() => {
    if (past.length === 0) return
    const previous = past[past.length - 1]
    const entry: AuditEntry = { at: Date.now(), action: 'undo', detail: 'Reverted last change' }
    setPast(past.slice(0, -1))
    setFuture([assignments, ...future])
    setAssignments(previous)
    setAuditLog((log) => [entry, ...log])
  }, [past, future, assignments])

  const redo = useCallback(() => {
    if (future.length === 0) return
    const nextState = future[0]
    const entry: AuditEntry = { at: Date.now(), action: 'redo', detail: 'Reapplied change' }
    setFuture(future.slice(1))
    setPast([...past, assignments])
    setAssignments(nextState)
    setAuditLog((log) => [entry, ...log])
  }, [past, future, assignments])

  const toggleLock = useCallback((paperId: string) => {
    setLockedPapers((locked) =>
      locked.includes(paperId) ? locked.filter((id) => id !== paperId) : [...locked, paperId],
    )
  }, [])

  const loadProject = useCallback((project: ProjectFile) => {
    setReviewers(project.reviewers)
    setPapers(project.papers)
    setLockedPapers(project.lockedPapers ?? [])
    // Merge with defaults so projects/persisted state saved before newer
    // settings fields existed still get sane values (forward compatibility).
    setSettings({ ...DEFAULT_SETTINGS, ...project.settings })
    setRun(project.run)
    setAssignments(project.assignments)
    setAuditLog(project.auditLog)
    setRunHistory(project.runHistory)
    setPast([])
    setFuture([])
    setStatus(project.run ? 'done' : 'idle')
    setError(null)
    setSampleLoaded(false)
  }, [])

  /** Back to a fresh install: state resets and the autosave persists the blank
   *  slate; remembered import column mappings are forgotten too. */
  const resetApp = useCallback(() => {
    setReviewers([])
    setPapers([])
    setSettings(DEFAULT_SETTINGS)
    setRun(null)
    setAssignments([])
    setLockedPapers([])
    setRunHistory([])
    setPast([])
    setFuture([])
    setAuditLog([])
    setStatus('idle')
    setError(null)
    setProgress(null)
    setSettingsInvalid(false)
    setSampleLoaded(false)
    setResetEpoch((n) => n + 1)
    try {
      localStorage.removeItem('mapping.reviewers')
      localStorage.removeItem('mapping.papers')
    } catch {
      /* storage may be unavailable */
    }
  }, [])

  // --- Persistence: hydrate once on mount, then autosave on change (SPEC §9).
  const hydrated = useRef(false)
  useEffect(() => {
    let cancelled = false
    idbGet<ProjectFile>(PERSIST_KEY).then((saved) => {
      if (!cancelled && saved && saved.app === 'reviewer-matcher') loadProject(saved)
      hydrated.current = true
    })
    return () => {
      cancelled = true
    }
  }, [loadProject])

  useEffect(() => {
    if (!hydrated.current) return
    void idbSet(PERSIST_KEY, {
      app: 'reviewer-matcher',
      schemaVersion: 1,
      reviewers,
      papers,
      settings,
      run,
      assignments,
      lockedPapers,
      auditLog,
      runHistory,
    })
  }, [reviewers, papers, settings, run, assignments, lockedPapers, auditLog, runHistory])

  const value = useMemo(
    () => ({
      reviewers,
      papers,
      settings,
      run,
      assignments,
      lockedPapers,
      runHistory,
      auditLog,
      canUndo: past.length > 0,
      canRedo: future.length > 0,
      status,
      error,
      progress,
      settingsInvalid,
      sampleLoaded,
      resetEpoch,
      setReviewers: setReviewersAction,
      setPapers: setPapersAction,
      setSettings,
      runMatching,
      commitAssignments,
      undo,
      redo,
      toggleLock,
      loadProject,
      setSettingsInvalid,
      setSampleLoaded,
      resetApp,
    }),
    [reviewers, papers, settings, run, assignments, lockedPapers, runHistory, auditLog, past.length, future.length, status, error, progress, settingsInvalid, sampleLoaded, resetEpoch, setReviewersAction, setPapersAction, runMatching, commitAssignments, undo, redo, toggleLock, loadProject, resetApp],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppState & AppActions {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppStoreProvider')
  return ctx
}
