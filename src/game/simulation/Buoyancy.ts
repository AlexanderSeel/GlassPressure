const GRAVITY = 9.81;

export function sphereVolume(radiusMeters: number): number {
  const r = Math.max(0, radiusMeters);
  return (4 / 3) * Math.PI * r * r * r;
}

export function submergedSphereVolume(radiusMeters: number, immersionDepthMeters: number): number {
  const r = Math.max(0, radiusMeters);
  if (r === 0) return 0;

  const h = Math.max(0, Math.min(2 * r, immersionDepthMeters));
  if (h === 0) return 0;
  if (h === 2 * r) return sphereVolume(r);

  return Math.PI * h * h * (r - h / 3);
}

export function buoyancyForceNewtons(
  fluidDensityKgM3: number,
  submergedVolumeM3: number,
  gravityMps2 = GRAVITY,
): number {
  return Math.max(0, fluidDensityKgM3) *
    Math.max(0, submergedVolumeM3) *
    Math.max(0, gravityMps2);
}


export function submergedCylinderVolume(
  radiusMeters: number,
  heightMeters: number,
  immersionDepthMeters: number,
): number {
  const r = Math.max(0, radiusMeters);
  const h = Math.max(0, heightMeters);
  if (r === 0 || h === 0) return 0;

  const submergedHeight = Math.max(
    0,
    Math.min(h, immersionDepthMeters),
  );
  return Math.PI * r * r * submergedHeight;
}


export function effectiveContainedLiquidWeightNewtons(
  volumeM3: number,
  densityKgM3: number,
  coupling01 = 1,
  gravityMps2 = GRAVITY,
): number {
  const volume = Math.max(0, volumeM3);
  const density = Math.max(0, densityKgM3);
  const coupling = Math.min(1, Math.max(0, coupling01));
  return volume * density * Math.max(0, gravityMps2) * coupling;
}
