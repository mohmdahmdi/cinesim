/**
 * Ranking and labeling for community similarity votes.
 *
 * Ranking uses the Wilson score lower bound for a Bernoulli proportion —
 * the standard "best comments" formula. It rewards both a high agree-rate
 * AND a large sample size, so a suggestion with 3 agrees / 0 disagrees
 * doesn't outrank one with 200 agrees / 20 disagrees.
 */
const Z = 1.96; // ~95% confidence

export function wilsonLowerBound(agreeCount: number, disagreeCount: number): number {
  const n = agreeCount + disagreeCount;
  if (n === 0) return 0;

  const p = agreeCount / n;
  const denominator = 1 + (Z * Z) / n;
  const centre = p + (Z * Z) / (2 * n);
  const margin = Z * Math.sqrt((p * (1 - p) + (Z * Z) / (4 * n)) / n);

  return (centre - margin) / denominator;
}

export const VALIDATION_MIN_VOTES = 5;
export const VALIDATION_MIN_AGREE_RATE = 0.6;

export function isValidated(agreeCount: number, disagreeCount: number): boolean {
  const total = agreeCount + disagreeCount;
  if (total < VALIDATION_MIN_VOTES) return false;
  return agreeCount / total >= VALIDATION_MIN_AGREE_RATE;
}

export function similarityLabel(agreeCount: number, disagreeCount: number): string {
  const total = agreeCount + disagreeCount;
  if (total < VALIDATION_MIN_VOTES) return 'Not enough votes yet';

  const rate = agreeCount / total;
  if (rate >= 0.9) return 'Very strong community agreement';
  if (rate >= 0.75) return 'Strong community agreement';
  if (rate >= VALIDATION_MIN_AGREE_RATE) return 'Moderate community agreement';
  if (rate >= 0.45) return 'Mixed opinions';
  return 'Disputed';
}

export type ReputationTier = 'Newcomer' | 'Contributor' | 'Trusted Contributor' | 'Curator';

export function reputationTier(score: number): ReputationTier {
  if (score >= 500) return 'Curator';
  if (score >= 150) return 'Trusted Contributor';
  if (score >= 20) return 'Contributor';
  return 'Newcomer';
}
