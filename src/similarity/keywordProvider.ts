import type { Scorer, SimilarityProvider } from './types'

/** Lowercase alphabetic tokens of length > 2 (drops trivial stopword-ish bits). */
function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z]+/g) ?? []).filter((t) => t.length > 2)
}

function termFrequencies(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>()
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1)
  return tf
}

function norm(tf: Map<string, number>): number {
  let sum = 0
  for (const v of tf.values()) sum += v * v
  return Math.sqrt(sum)
}

/**
 * Stub similarity: cosine over term-frequency vectors. Fast, dependency-free,
 * fully offline — used to make the end-to-end thread work (Stage 2) before the
 * real embeddings provider lands (Stage 3). Lower quality (no synonyms), which
 * is the documented trade-off in the plan.
 */
export const keywordProvider: SimilarityProvider = {
  name: 'keyword-tfidf',
  async build(texts, onProgress): Promise<Scorer> {
    const vectors = new Map<string, Map<string, number>>()
    const norms = new Map<string, number>()
    let done = 0
    for (const { id, text } of texts) {
      const tf = termFrequencies(tokenize(text))
      vectors.set(id, tf)
      norms.set(id, norm(tf))
      done += 1
      onProgress?.({ phase: 'embed', loaded: done, total: texts.length })
    }
    return {
      similarity(idA: string, idB: string): number {
        const a = vectors.get(idA)
        const b = vectors.get(idB)
        const na = norms.get(idA) ?? 0
        const nb = norms.get(idB) ?? 0
        if (!a || !b || na === 0 || nb === 0) return 0
        // Iterate the smaller vector for the dot product.
        const [small, large] = a.size <= b.size ? [a, b] : [b, a]
        let dot = 0
        for (const [term, count] of small) {
          const other = large.get(term)
          if (other) dot += count * other
        }
        return dot / (na * nb)
      },
    }
  },
}
