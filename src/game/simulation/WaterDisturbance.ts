export type WaterDisturbanceCandidate = {
  x: number;
  z: number;
  velocityX: number;
  velocityY: number;
  velocityZ: number;
  radiusScene: number;
};

export function pickDominantWaterDisturbance(
  candidates: readonly WaterDisturbanceCandidate[],
): WaterDisturbanceCandidate | null {
  let best: WaterDisturbanceCandidate | null = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    const speed = Math.hypot(
      candidate.velocityX,
      candidate.velocityY,
      candidate.velocityZ,
    );
    const score = speed * Math.max(0, candidate.radiusScene);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best;
}
