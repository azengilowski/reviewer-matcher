/// <reference lib="webworker" />
import type { Assignment, MatchSettings, Paper, Reviewer } from '../domain/types'
import { createEmbeddingProvider } from '../similarity/embeddingProvider'
import type { ProgressUpdate } from '../similarity/types'
import { runMatch } from './runMatch'

export interface MatchWorkerRequest {
  reviewers: Reviewer[]
  papers: Paper[]
  settings: MatchSettings
  lockedAssignments: Assignment[]
}

export type MatchWorkerMessage =
  | { type: 'progress'; update: ProgressUpdate }
  | { type: 'result'; run: Awaited<ReturnType<typeof runMatch>> }
  | { type: 'error'; message: string }

// Runs the full pipeline (embedding + matching) off the main thread so the UI
// stays responsive while the model works (SPEC §9).
self.onmessage = async (event: MessageEvent<MatchWorkerRequest>) => {
  const { reviewers, papers, settings, lockedAssignments } = event.data
  try {
    const provider = createEmbeddingProvider(settings.embeddingModel)
    const run = await runMatch(
      reviewers,
      papers,
      settings,
      provider,
      (update) => {
        const msg: MatchWorkerMessage = { type: 'progress', update }
        self.postMessage(msg)
      },
      lockedAssignments,
    )
    const msg: MatchWorkerMessage = { type: 'result', run }
    self.postMessage(msg)
  } catch (err) {
    const msg: MatchWorkerMessage = {
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    }
    self.postMessage(msg)
  }
}
