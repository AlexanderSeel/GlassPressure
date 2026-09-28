export type GlassStressInput = {
  drilling: boolean;
  alignment01: number;
  steadiness01: number;
  diameterMeters: number;
  localPressurePa: number;
  wallThicknessMeters: number;
  nearbyDamage01: number;
};

export type GlassStressResult = {
  stress01: number;
  growthPerSecond: number;
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function stepGlassStress(
  currentStress01: number,
  input: GlassStressInput,
  dtSeconds: number,
): GlassStressResult {
  const dt = Math.max(0, Math.min(dtSeconds, 0.05));
  const current = clamp01(currentStress01);

  if (!input.drilling) {
    return {
      stress01: Math.max(0, current - dt * 0.018),
      growthPerSecond: -0.018,
    };
  }

  const misalignment = 1 - clamp01(input.alignment01);
  const instability = 1 - clamp01(input.steadiness01);
  const diameterMm = Math.max(0, input.diameterMeters) * 1000;
  const pressureKPa = Math.max(0, input.localPressurePa) / 1000;
  const thicknessMm = Math.max(0.5, input.wallThicknessMeters * 1000);
  const damage = clamp01(input.nearbyDamage01);

  const diameterFactor = Math.max(0, (diameterMm - 4) / 12);
  const thinGlassFactor = Math.max(0, (5 - thicknessMm) / 4.5);
  const pressureFactor = Math.min(1.5, pressureKPa / 6);

  const growthPerSecond =
    0.015 +
    misalignment * 0.22 +
    instability * 0.18 +
    diameterFactor * 0.08 +
    thinGlassFactor * 0.12 +
    pressureFactor * 0.035 +
    damage * 0.16;

  return {
    stress01: clamp01(current + growthPerSecond * dt),
    growthPerSecond,
  };
}

export function drillingEfficiency(alignment01: number, steadiness01: number): number {
  const alignment = clamp01(alignment01);
  const steadiness = clamp01(steadiness01);
  return Math.pow(alignment, 1.4) * (0.35 + 0.65 * steadiness);
}
