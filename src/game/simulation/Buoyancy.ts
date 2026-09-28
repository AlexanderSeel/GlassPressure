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
