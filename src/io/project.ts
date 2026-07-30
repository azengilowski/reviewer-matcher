import type {
  Assignment,
  AuditEntry,
  MatchRun,
  MatchSettings,
  Paper,
  Reviewer,
  RunSummary,
} from '../domain/types'

export const PROJECT_SCHEMA_VERSION = 1

/**
 * The self-contained project bundle (`.matchproj`, SPEC §5.8/§6). Carries
 * everything needed to restore full app state with no re-run: the preference
 * lists in `run` are derived from embeddings, so the board, detail, and
 * dashboard views all work immediately on import.
 */
export interface ProjectFile {
  app: 'reviewer-matcher'
  schemaVersion: number
  reviewers: Reviewer[]
  papers: Paper[]
  settings: MatchSettings
  run: MatchRun | null
  assignments: Assignment[]
  lockedPapers: string[]
  auditLog: AuditEntry[]
  runHistory: RunSummary[]
}

export interface ProjectState {
  reviewers: Reviewer[]
  papers: Paper[]
  settings: MatchSettings
  run: MatchRun | null
  assignments: Assignment[]
  lockedPapers: string[]
  auditLog: AuditEntry[]
  runHistory: RunSummary[]
}

export function buildProject(state: ProjectState): ProjectFile {
  return {
    app: 'reviewer-matcher',
    schemaVersion: PROJECT_SCHEMA_VERSION,
    ...state,
  }
}

export function serializeProject(state: ProjectState): string {
  return JSON.stringify(buildProject(state), null, 2)
}

export type ParseResult =
  | { ok: true; project: ProjectFile }
  | { ok: false; error: string }

/** Parse + validate a project file, guarding the schema version. */
export function parseProject(json: string): ParseResult {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return { ok: false, error: 'Not a valid project file (invalid JSON).' }
  }
  if (typeof data !== 'object' || data === null) {
    return { ok: false, error: 'Not a valid project file.' }
  }
  const p = data as Partial<ProjectFile>
  if (p.app !== 'reviewer-matcher') {
    return { ok: false, error: 'This file was not created by Peerfect Match.' }
  }
  if (p.schemaVersion !== PROJECT_SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Unsupported project version ${p.schemaVersion} (this app reads v${PROJECT_SCHEMA_VERSION}).`,
    }
  }
  if (!Array.isArray(p.reviewers) || !Array.isArray(p.papers) || !p.settings) {
    return { ok: false, error: 'Project file is missing required data.' }
  }
  return {
    ok: true,
    project: {
      app: 'reviewer-matcher',
      schemaVersion: p.schemaVersion,
      reviewers: p.reviewers,
      papers: p.papers,
      settings: p.settings,
      run: p.run ?? null,
      assignments: p.assignments ?? [],
      lockedPapers: p.lockedPapers ?? [],
      auditLog: p.auditLog ?? [],
      runHistory: p.runHistory ?? [],
    },
  }
}
