/**
 * Similarity scores are cosine similarity (0–1) plus an optional method-match
 * boost, so raw values can exceed 1. Ranking uses the raw value; for display
 * we clamp to 1 so users never see an impossible-looking "1.04 similarity".
 */
export function fmtScore(score: number, digits = 2): string {
  return Math.min(1, Math.max(0, score)).toFixed(digits)
}
