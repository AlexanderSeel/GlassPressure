import type { DrillTargetEffect } from "./LevelDefinition";

export function effectiveTargetPressurePa(
  rawPressurePa: number,
  targetEffect: DrillTargetEffect,
  pressureReliefOpen: boolean,
): number {
  const pressure = Math.max(0, rawPressurePa);
  if (targetEffect === "primary-drain" && pressureReliefOpen) {
    return pressure * 0.72;
  }
  return pressure;
}

export function targetProgressMultiplier(
  targetEffect: DrillTargetEffect,
  pressureReliefOpen: boolean,
): number {
  if (targetEffect === "primary-drain" && pressureReliefOpen) {
    return 1.08;
  }
  return 1;
}
