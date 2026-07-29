import { afterEach, beforeEach, vi } from 'vitest'

// Deterministic fake encoder: maps a few keywords to axes of a unit vector, so
// related texts get similar vectors — no model download in CI (plan: mock the
// model to keep CI fast).
const AXES = ['math', 'literacy', 'science', 'technology']
function fakeVector(text: string): Float32Array {
  const v = new Float32Array(AXES.length)
  const lower = text.toLowerCase()
  AXES.forEach((axis, i) => {
    if (lower.includes(axis)) v[i] = 1
  })
  // L2 normalize (fall back to a fixed axis for empty text).
  let norm = Math.hypot(...v)
  if (norm === 0) {
    v[0] = 1
    norm = 1
  }
  for (let i = 0; i < v.length; i++) v[i] /= norm
  return v
}

const pipelineMock = vi.fn(async () => {
  return async (text: string) => ({ data: fakeVector(text) })
})

vi.mock('@huggingface/transformers', () => ({
  pipeline: () => pipelineMock(),
}))

let embeddingProvider: typeof import('./embeddingProvider').embeddingProvider
let _resetExtractor: typeof import('./embeddingProvider')._resetExtractor

beforeEach(async () => {
  pipelineMock.mockClear()
  const mod = await import('./embeddingProvider')
  embeddingProvider = mod.embeddingProvider
  _resetExtractor = mod._resetExtractor
  _resetExtractor()
})
afterEach(() => vi.clearAllMocks())

describe('embeddingProvider', () => {
  it('embeds texts and scores related ones higher (cosine of unit vectors)', async () => {
    const scorer = await embeddingProvider.build([
      { id: 'paper', text: 'math cognitive load' },
      { id: 'mathRev', text: 'math problem solving' },
      { id: 'litRev', text: 'literacy reading' },
    ])
    expect(scorer.similarity('paper', 'mathRev')).toBeGreaterThan(
      scorer.similarity('paper', 'litRev'),
    )
    // Identical axis → cosine 1.
    expect(scorer.similarity('paper', 'mathRev')).toBeCloseTo(1)
  })

  it('loads the pipeline only once across builds of the same model (caching)', async () => {
    await embeddingProvider.build([{ id: 'a', text: 'math' }])
    await embeddingProvider.build([{ id: 'b', text: 'science' }])
    expect(pipelineMock).toHaveBeenCalledTimes(1)
  })

  it('createEmbeddingProvider loads a separate pipeline per model id', async () => {
    const mod = await import('./embeddingProvider')
    await mod.createEmbeddingProvider('model-A').build([{ id: 'a', text: 'math' }])
    await mod.createEmbeddingProvider('model-B').build([{ id: 'b', text: 'science' }])
    expect(pipelineMock).toHaveBeenCalledTimes(2)
  })

  it('reports embed progress for every text', async () => {
    const seen: Array<[number, number]> = []
    await embeddingProvider.build(
      [
        { id: 'a', text: 'math' },
        { id: 'b', text: 'science' },
      ],
      (p) => {
        if (p.phase === 'embed') seen.push([p.loaded, p.total])
      },
    )
    expect(seen).toEqual([
      [1, 2],
      [2, 2],
    ])
  })
})
