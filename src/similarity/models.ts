/** Selectable in-browser embedding models (transformers.js / ONNX). */
export interface EmbeddingModel {
  id: string
  label: string
  /** Approx one-time download size (quantized), MB — shown to the user. */
  sizeMB: number
  dim: number
}

// All are mean-pooled + L2-normalized sentence encoders that work without
// query/passage prefixes. Ordered small→large (download size / quality).
export const EMBEDDING_MODELS: EmbeddingModel[] = [
  { id: 'Xenova/all-MiniLM-L6-v2', label: 'MiniLM-L6 · fast, smallest (default)', sizeMB: 23, dim: 384 },
  { id: 'mixedbread-ai/mxbai-embed-xsmall-v1', label: 'mxbai-xsmall · 2024, ties the default', sizeMB: 24, dim: 384 },
  { id: 'Xenova/all-MiniLM-L12-v2', label: 'MiniLM-L12 · deeper', sizeMB: 34, dim: 384 },
  { id: 'Xenova/gte-small', label: 'GTE-small · strong retrieval', sizeMB: 34, dim: 384 },
  { id: 'Xenova/bge-small-en-v1.5', label: 'BGE-small · strong retrieval', sizeMB: 34, dim: 384 },
  { id: 'Xenova/all-mpnet-base-v2', label: 'MPNet-base · higher quality, larger', sizeMB: 110, dim: 768 },
  { id: 'Xenova/bge-base-en-v1.5', label: 'BGE-base · higher quality, larger', sizeMB: 110, dim: 768 },
]

export const DEFAULT_MODEL = EMBEDDING_MODELS[0].id

export function isKnownModel(id: string): boolean {
  return EMBEDDING_MODELS.some((m) => m.id === id)
}
