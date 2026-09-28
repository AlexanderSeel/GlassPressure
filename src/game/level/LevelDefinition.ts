import type { LevelGoal } from "./LevelState";

export type DrillTargetEffect = "primary-drain" | "pressure-relief";

export type DrillTargetDefinition = {
  id: string;
  label: string;
  effect: DrillTargetEffect;
  localPosition: readonly [number, number, number];
  localRotation: readonly [number, number, number];
  markerDiameterScene: number;
  holeDiameterScale: number;
  holeElevationMeters: number;
  wallThicknessMeters: number;
  stressMultiplier: number;
};

export type HostMotionDefinition = {
  lateralAmplitudeScene: number;
  verticalAmplitudeScene: number;
  frequencyHz: number;
  phaseRadians: number;
};

export type LevelDefinition = {
  id: string;
  name: string;
  objective: string;
  initialSourceVolumeM3: number;
  sourceCapacityM3: number;
  sourceHeightMeters: number;
  sourceInletM3PerSecond: number;
  initialReceiverVolumeM3: number;
  receiverCapacityM3: number;
  goal: LevelGoal;
  hostMotion?: HostMotionDefinition;
  targets: readonly DrillTargetDefinition[];
};

export const FIRST_LEVEL: LevelDefinition = {
  id: "pressure-lesson",
  name: "Pressure Lesson",
  objective: "Drain the upper vessel, fill the receiver and lift the inner vessel.",
  initialSourceVolumeM3: 0.0084,
  sourceCapacityM3: 0.012,
  sourceHeightMeters: 0.52,
  sourceInletM3PerSecond: 0.000026,
  initialReceiverVolumeM3: 0.008,
  receiverCapacityM3: 0.018,
  goal: {
    maxSourceFill01: 0.58,
    minReceiverFill01: 0.62,
    minInnerHeightScene: 2.02,
  },
  targets: [
    {
      id: "main-drain",
      label: "Main drain",
      effect: "primary-drain",
      localPosition: [0, 0.03, -1.82],
      localRotation: [Math.PI / 2, 0, 0],
      markerDiameterScene: 0.56,
      holeDiameterScale: 1,
      holeElevationMeters: 0.08,
      wallThicknessMeters: 0.004,
      stressMultiplier: 1,
    },
    {
      id: "relief-vent",
      label: "Pressure relief",
      effect: "pressure-relief",
      localPosition: [1.82, 0.2, 0],
      localRotation: [Math.PI / 2, Math.PI / 2, 0],
      markerDiameterScene: 0.43,
      holeDiameterScale: 0.45,
      holeElevationMeters: 0.31,
      wallThicknessMeters: 0.0035,
      stressMultiplier: 1.16,
    },
  ],
};

export const SECOND_LEVEL: LevelDefinition = {
  id: "moving-pressure",
  name: "Moving Pressure",
  objective: "Control pressure while the upper vessel moves, then lift the inner vessel.",
  initialSourceVolumeM3: 0.0093,
  sourceCapacityM3: 0.012,
  sourceHeightMeters: 0.52,
  sourceInletM3PerSecond: 0.000041,
  initialReceiverVolumeM3: 0.0065,
  receiverCapacityM3: 0.018,
  goal: {
    maxSourceFill01: 0.54,
    minReceiverFill01: 0.61,
    minInnerHeightScene: 2.05,
  },
  hostMotion: {
    lateralAmplitudeScene: 0.42,
    verticalAmplitudeScene: 0.09,
    frequencyHz: 0.19,
    phaseRadians: 0.7,
  },
  targets: [
    {
      id: "moving-main",
      label: "Moving main drain",
      effect: "primary-drain",
      localPosition: [-0.38, -0.08, -1.78],
      localRotation: [Math.PI / 2, 0, 0],
      markerDiameterScene: 0.38,
      holeDiameterScale: 0.92,
      holeElevationMeters: 0.1,
      wallThicknessMeters: 0.0036,
      stressMultiplier: 1.12,
    },
    {
      id: "moving-relief",
      label: "Moving relief vent",
      effect: "pressure-relief",
      localPosition: [1.78, 0.26, 0.28],
      localRotation: [Math.PI / 2, Math.PI / 2, 0],
      markerDiameterScene: 0.31,
      holeDiameterScale: 0.4,
      holeElevationMeters: 0.34,
      wallThicknessMeters: 0.0033,
      stressMultiplier: 1.22,
    },
  ],
};

export const LEVELS: readonly LevelDefinition[] = [
  FIRST_LEVEL,
  SECOND_LEVEL,
];

export function validateLevelDefinition(level: LevelDefinition): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  if (level.sourceCapacityM3 <= 0) errors.push("source capacity must be positive");
  if (level.receiverCapacityM3 <= 0) errors.push("receiver capacity must be positive");
  if (level.targets.length === 0) errors.push("at least one drill target is required");

  if (level.hostMotion) {
    if (level.hostMotion.frequencyHz < 0) errors.push("host motion frequency cannot be negative");
    if (level.hostMotion.lateralAmplitudeScene < 0) errors.push("lateral amplitude cannot be negative");
    if (level.hostMotion.verticalAmplitudeScene < 0) errors.push("vertical amplitude cannot be negative");
  }

  for (const target of level.targets) {
    if (ids.has(target.id)) errors.push(`duplicate target id: ${target.id}`);
    ids.add(target.id);
    if (target.holeDiameterScale <= 0) errors.push(`invalid diameter scale: ${target.id}`);
    if (target.wallThicknessMeters <= 0) errors.push(`invalid wall thickness: ${target.id}`);
  }

  return errors;
}
