/**
 * Similarity seam (SPEC §4.1). Everything that produces preference orderings
 * goes through this interface, so the stub keyword provider (Stage 2) and the
 * real in-browser embeddings provider (Stage 3) are interchangeable.
 */

export interface PreparedText {
  id: string
  text: string
}

export interface Scorer {
  /** Cosine-like similarity in [0, 1] between two prepared ids. */
  similarity(idA: string, idB: string): number
}

/** Progress signal: model download (bytes) or text embedding (item counts). */
export interface ProgressUpdate {
  phase: 'download' | 'embed'
  loaded: number
  total: number
}

export interface SimilarityProvider {
  readonly name: string
  /**
   * Precompute a representation for every text (embeddings encode here; the
   * keyword stub builds term-frequency vectors). Async so heavy providers can
   * download a model / run in a worker.
   */
  build(texts: PreparedText[], onProgress?: (p: ProgressUpdate) => void): Promise<Scorer>
}
