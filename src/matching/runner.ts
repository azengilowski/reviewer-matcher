import type { Assignment, MatchRun, MatchSettings, Paper, Reviewer } from '../domain/types'
import { keywordProvider } from '../similarity/keywordProvider'
import type { ProgressUpdate } from '../similarity/types'
import type { MatchWorkerMessage, MatchWorkerRequest } from './matchWorker'
import { runMatch } from './runMatch'

/** How the app executes a match. Injectable so tests avoid the worker/model. */
export type MatchRunner = (
  reviewers: Reviewer[],
  papers: Paper[],
  settings: MatchSettings,
  onProgress?: (p: ProgressUpdate) => void,
  lockedAssignments?: Assignment[],
) => Promise<MatchRun>

/**
 * Default runner: spins up the Web Worker (embeddings) and resolves with the
 * result. Keeps embedding + matching off the main thread (SPEC §9).
 */
export const workerRunner: MatchRunner = (reviewers, papers, settings, onProgress, lockedAssignments = []) =>
  new Promise<MatchRun>((resolve, reject) => {
    const worker = new Worker(new URL('./matchWorker.ts', import.meta.url), {
      type: 'module',
    })
    worker.onmessage = (event: MessageEvent<MatchWorkerMessage>) => {
      const msg = event.data
      if (msg.type === 'progress') {
        onProgress?.(msg.update)
      } else if (msg.type === 'result') {
        resolve(msg.run)
        worker.terminate()
      } else {
        reject(new Error(msg.message))
        worker.terminate()
      }
    }
    worker.onerror = (event) => {
      reject(new Error(event.message || 'Match worker failed'))
      worker.terminate()
    }
    const request: MatchWorkerRequest = { reviewers, papers, settings, lockedAssignments }
    worker.postMessage(request)
  })

/** Synchronous, dependency-light runner using the keyword stub (tests/fallback). */
export const keywordRunner: MatchRunner = (reviewers, papers, settings, onProgress, lockedAssignments = []) =>
  runMatch(reviewers, papers, settings, keywordProvider, onProgress, lockedAssignments)
