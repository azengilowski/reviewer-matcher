import { DEFAULT_MODEL } from './models'
import type { PreparedText, ProgressUpdate, Scorer, SimilarityProvider } from './types'

// In-browser sentence encoders (SPEC §4.1), run as ONNX/WASM. Models download
// once and are cached by transformers.js (Cache API), then work offline.

type FeatureExtractor = (
  text: string,
  opts: { pooling: 'mean'; normalize: boolean },
) => Promise<{ data: Float32Array | number[] }>

const extractorCache = new Map<string, Promise<FeatureExtractor>>()

interface DownloadEvent {
  status: string
  file?: string
  loaded?: number
  total?: number
}

/**
 * Lazily create (and memoize per model id) the feature-extraction pipeline.
 * Reports aggregate download progress (summed across files) on first load.
 */
async function getExtractor(
  modelId: string,
  onDownload?: (loaded: number, total: number) => void,
): Promise<FeatureExtractor> {
  let promise = extractorCache.get(modelId)
  if (!promise) {
    promise = (async () => {
      const { pipeline } = await import('@huggingface/transformers')
      const files = new Map<string, { loaded: number; total: number }>()
      return (await pipeline('feature-extraction', modelId, {
        progress_callback: (p: DownloadEvent) => {
          if (p.status === 'progress' && p.file) {
            files.set(p.file, { loaded: p.loaded ?? 0, total: p.total ?? 0 })
            let loaded = 0
            let total = 0
            for (const f of files.values()) {
              loaded += f.loaded
              total += f.total
            }
            onDownload?.(loaded, total)
          }
        },
      })) as unknown as FeatureExtractor
    })()
    extractorCache.set(modelId, promise)
  }
  return promise
}

/** Reset cached pipelines (used by tests). */
export function _resetExtractor(): void {
  extractorCache.clear()
}

/**
 * Create an embeddings-based similarity provider for a given model. Encodes
 * every text (mean-pooled, L2-normalized), so cosine similarity is a dot product.
 */
export function createEmbeddingProvider(modelId: string = DEFAULT_MODEL): SimilarityProvider {
  return {
    name: modelId,
    async build(
      texts: PreparedText[],
      onProgress?: (p: ProgressUpdate) => void,
    ): Promise<Scorer> {
      const extractor = await getExtractor(modelId, (loaded, total) =>
        onProgress?.({ phase: 'download', loaded, total }),
      )
    const vectors = new Map<string, Float32Array>()
    let done = 0
    for (const { id, text } of texts) {
      const output = await extractor(text || ' ', { pooling: 'mean', normalize: true })
      vectors.set(id, Float32Array.from(output.data))
      done += 1
      onProgress?.({ phase: 'embed', loaded: done, total: texts.length })
    }
    return {
      similarity(idA: string, idB: string): number {
        const a = vectors.get(idA)
        const b = vectors.get(idB)
        if (!a || !b) return 0
        let dot = 0
        for (let i = 0; i < a.length; i++) dot += a[i] * b[i]
        return dot // already normalized → cosine similarity
      },
    }
    },
  }
}

/** Default provider (MiniLM-L6) for back-compat with existing callers/tests. */
export const embeddingProvider: SimilarityProvider = createEmbeddingProvider(DEFAULT_MODEL)
