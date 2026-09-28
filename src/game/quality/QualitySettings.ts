export type QualityTier = "low" | "medium" | "high";

export type QualityPreset = {
  tier: QualityTier;
  hardwareScalingLevel: number;
  glassRefractionIntensity: number;
  flowParticlePoolSize: number;
};

export const QUALITY_PRESETS: Record<QualityTier, QualityPreset> = {
  low: {
    tier: "low",
    hardwareScalingLevel: 1.5,
    glassRefractionIntensity: 0.35,
    flowParticlePoolSize: 10,
  },
  medium: {
    tier: "medium",
    hardwareScalingLevel: 1.2,
    glassRefractionIntensity: 0.62,
    flowParticlePoolSize: 18,
  },
  high: {
    tier: "high",
    hardwareScalingLevel: 1,
    glassRefractionIntensity: 0.85,
    flowParticlePoolSize: 28,
  },
};

export function selectInitialQuality(
  hardwareConcurrency: number | undefined,
  maxTouchPoints: number | undefined,
  devicePixelRatio: number | undefined,
): QualityPreset {
  const cores = hardwareConcurrency ?? 8;
  const touch = maxTouchPoints ?? 0;
  const dpr = devicePixelRatio ?? 1;

  if (cores <= 4 || (touch > 0 && dpr >= 2.5)) return QUALITY_PRESETS.low;
  if (cores <= 8 || touch > 0) return QUALITY_PRESETS.medium;
  return QUALITY_PRESETS.high;
}
