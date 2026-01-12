export function getDisplayStressIndex(stressIndex?: number | null, engagementScore?: number | null) {
  if (stressIndex == null && engagementScore == null) return null;
  if ((stressIndex == null || stressIndex === 0) && (engagementScore ?? 0) > 0) {
    return engagementScore ?? null;
  }
  return stressIndex ?? null;
}

export function getEngagementFromParticipation(participation?: number | null, fallback?: number | null) {
  if (participation == null) return fallback ?? null;
  const safe = Math.max(0, Math.min(100, participation));
  return Number((safe / 10).toFixed(1));
}
