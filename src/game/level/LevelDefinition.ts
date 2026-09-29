import type { LevelGoal } from "./LevelState";

export type DrillTargetEffect = "primary-drain" | "pressure-relief" | "nested-drain";
export type DrillTargetHost = "source" | "nested";

export type DrillTargetDefinition = {
  id: string;
  label: string;
  effect: DrillTargetEffect;
  host?: DrillTargetHost;
  minHostHeightScene?: number;
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
  rotationAmplitudeRadians?: number;
  frequencyHz: number;
  phaseRadians: number;
};

export type SourceRingDefinition = {
  diameterScene: number;
  thicknessScene: number;
  localY: number;
  tiltRadians: number;
};

export type NestedVesselDefinition = {
  enabled: boolean;
  radiusScene: number;
  initialPosition: readonly [number, number, number];
  baseMassKg: number;
  fluidCapacityM3: number;
  initialFluidVolumeM3: number;
  fluidHeightMeters: number;
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
  sourceRing?: SourceRingDefinition;
  nestedAssembly?: boolean;
  primaryBodyInitialPosition?: readonly [number, number, number];
  nestedVessel?: NestedVesselDefinition;
  targets: readonly DrillTargetDefinition[];
};

export const FIRST_LEVEL: LevelDefinition = {
  id: "nested-lift",
  name: "Nested Lift",
  objective:
    "Let the parent cup fill, drill its transfer port, then catch the rising inner glass body and drill it before the flow washes it over the rim.",
  initialSourceVolumeM3: 0.006,
  sourceCapacityM3: 0.012,
  sourceHeightMeters: 0.72,
  sourceInletM3PerSecond: 0.00022,
  initialReceiverVolumeM3: 0.0012,
  receiverCapacityM3: 0.032,
  goal: {
    maxSourceFill01: 1,
    minReceiverFill01: 0.08,
    minInnerHeightScene: 2.8,
    requireSecondaryHole: true,
    minSecondaryHeightScene: 3.15,
    requireSecondaryEscaped: true,
  },
  nestedAssembly: true,
  primaryBodyInitialPosition: [0.58, 2.35, 0.05],
  nestedVessel: {
    enabled: true,
    radiusScene: 0.48,
    initialPosition: [-0.58, 2.34, -0.05],
    baseMassKg: 0.13,
    fluidCapacityM3: 0.00048,
    initialFluidVolumeM3: 0.00012,
    fluidHeightMeters: 0.085,
  },
  targets: [
    {
      id: "parent-transfer-port",
      label: "Parent transfer port",
      effect: "primary-drain",
      host: "source",
      localPosition: [0, -0.18, -1.86],
      localRotation: [Math.PI / 2, 0, 0],
      markerDiameterScene: 0.48,
      holeDiameterScale: 0.72,
      holeElevationMeters: 0.11,
      wallThicknessMeters: 0.0038,
      stressMultiplier: 1.08,
    },
    {
      id: "inner-release-port",
      label: "Inner release port",
      effect: "nested-drain",
      host: "nested",
      minHostHeightScene: 3.05,
      localPosition: [0, -0.03, -0.49],
      localRotation: [Math.PI / 2, 0, 0],
      markerDiameterScene: 0.3,
      holeDiameterScale: 0.68,
      holeElevationMeters: 0.012,
      wallThicknessMeters: 0.003,
      stressMultiplier: 1.16,
    },
    {
      id: "parent-relief",
      label: "Parent pressure relief",
      effect: "pressure-relief",
      host: "source",
      localPosition: [1.86, 0.27, 0],
      localRotation: [Math.PI / 2, Math.PI / 2, 0],
      markerDiameterScene: 0.27,
      holeDiameterScale: 0.34,
      holeElevationMeters: 0.48,
      wallThicknessMeters: 0.0032,
      stressMultiplier: 1.2,
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
  sourceInletM3PerSecond: 0.00028,
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
  nestedVessel: {
    enabled: true,
    radiusScene: 0.48,
    initialPosition: [-0.72, 1.28, -0.18],
    baseMassKg: 0.1,
    fluidCapacityM3: 0.00048,
    initialFluidVolumeM3: 0.00005,
    fluidHeightMeters: 0.085,
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

export const THIRD_LEVEL: LevelDefinition = {
  id: "jet-routing",
  name: "Jet Routing",
  objective: "Drain and lift the inner vessel into the right-side routing zone.",
  initialSourceVolumeM3: 0.009,
  sourceCapacityM3: 0.012,
  sourceHeightMeters: 0.52,
  sourceInletM3PerSecond: 0.00026,
  initialReceiverVolumeM3: 0.007,
  receiverCapacityM3: 0.018,
  goal: {
    maxSourceFill01: 0.56,
    minReceiverFill01: 0.62,
    minInnerHeightScene: 2.02,
    minInnerXScene: 0.68,
  },
  nestedVessel: {
    enabled: true,
    radiusScene: 0.48,
    initialPosition: [-0.6, 1.32, 0.28],
    baseMassKg: 0.1,
    fluidCapacityM3: 0.00048,
    initialFluidVolumeM3: 0.00005,
    fluidHeightMeters: 0.085,
  },
  targets: [
    {
      id: "route-right",
      label: "Right routing drain",
      effect: "primary-drain",
      localPosition: [1.82, -0.1, 0],
      localRotation: [Math.PI / 2, Math.PI / 2, 0],
      markerDiameterScene: 0.34,
      holeDiameterScale: 0.82,
      holeElevationMeters: 0.11,
      wallThicknessMeters: 0.0036,
      stressMultiplier: 1.1,
    },
    {
      id: "fast-left",
      label: "Fast left drain",
      effect: "primary-drain",
      localPosition: [-1.82, -0.18, 0],
      localRotation: [Math.PI / 2, Math.PI / 2, 0],
      markerDiameterScene: 0.4,
      holeDiameterScale: 1.18,
      holeElevationMeters: 0.08,
      wallThicknessMeters: 0.0038,
      stressMultiplier: 1.06,
    },
    {
      id: "routing-relief",
      label: "Routing relief",
      effect: "pressure-relief",
      localPosition: [0.2, 0.28, -1.8],
      localRotation: [Math.PI / 2, 0, 0],
      markerDiameterScene: 0.3,
      holeDiameterScale: 0.38,
      holeElevationMeters: 0.35,
      wallThicknessMeters: 0.0032,
      stressMultiplier: 1.24,
    },
  ],
};

export const FOURTH_LEVEL: LevelDefinition = {
  id: "nested-release",
  name: "Nested Release",
  objective:
    "Fill the lower receiver, float the nested vessel into reach, then drain it to release its trapped weight.",
  initialSourceVolumeM3: 0.0092,
  sourceCapacityM3: 0.012,
  sourceHeightMeters: 0.52,
  sourceInletM3PerSecond: 0.0003,
  initialReceiverVolumeM3: 0.0058,
  receiverCapacityM3: 0.018,
  goal: {
    maxSourceFill01: 0.56,
    minReceiverFill01: 0.64,
    minInnerHeightScene: 2.0,
    requireSecondaryHole: true,
    minSecondaryHeightScene: 2.72,
  },
  nestedVessel: {
    enabled: true,
    radiusScene: 0.48,
    initialPosition: [-0.65, 1.25, 0.25],
    baseMassKg: 0.13,
    fluidCapacityM3: 0.00048,
    initialFluidVolumeM3: 0.0004,
    fluidHeightMeters: 0.085,
  },
  targets: [
    {
      id: "nested-feed",
      label: "Receiver feed",
      effect: "primary-drain",
      host: "source",
      localPosition: [0.25, -0.14, -1.8],
      localRotation: [Math.PI / 2, 0, 0],
      markerDiameterScene: 0.34,
      holeDiameterScale: 0.95,
      holeElevationMeters: 0.09,
      wallThicknessMeters: 0.0036,
      stressMultiplier: 1.1,
    },
    {
      id: "nested-release-hole",
      label: "Nested release",
      effect: "nested-drain",
      host: "nested",
      minHostHeightScene: 2.28,
      localPosition: [0, -0.03, -0.49],
      localRotation: [Math.PI / 2, 0, 0],
      markerDiameterScene: 0.3,
      holeDiameterScale: 0.7,
      holeElevationMeters: 0.012,
      wallThicknessMeters: 0.003,
      stressMultiplier: 1.18,
    },
    {
      id: "nested-relief",
      label: "Pressure relief",
      effect: "pressure-relief",
      host: "source",
      localPosition: [1.78, 0.24, 0.25],
      localRotation: [Math.PI / 2, Math.PI / 2, 0],
      markerDiameterScene: 0.28,
      holeDiameterScale: 0.4,
      holeElevationMeters: 0.34,
      wallThicknessMeters: 0.0032,
      stressMultiplier: 1.22,
    },
  ],
};

export const FIFTH_LEVEL: LevelDefinition = {
  id: "rotating-collar",
  name: "Rotating Collar",
  objective:
    "Time the rotating collar, drain the source and keep the floating vessel inside the central routing band.",
  initialSourceVolumeM3: 0.0094,
  sourceCapacityM3: 0.012,
  sourceHeightMeters: 0.52,
  sourceInletM3PerSecond: 0.00032,
  initialReceiverVolumeM3: 0.0068,
  receiverCapacityM3: 0.018,
  goal: {
    maxSourceFill01: 0.53,
    minReceiverFill01: 0.63,
    minInnerHeightScene: 2.04,
    minInnerXScene: -0.34,
    maxInnerXScene: 0.34,
  },
  hostMotion: {
    lateralAmplitudeScene: 0.12,
    verticalAmplitudeScene: 0.04,
    rotationAmplitudeRadians: Math.PI,
    frequencyHz: 0.16,
    phaseRadians: 0.35,
  },
  sourceRing: {
    diameterScene: 4.05,
    thicknessScene: 0.16,
    localY: -0.02,
    tiltRadians: 0.34,
  },
  nestedVessel: {
    enabled: true,
    radiusScene: 0.48,
    initialPosition: [0.72, 1.3, -0.2],
    baseMassKg: 0.1,
    fluidCapacityM3: 0.00048,
    initialFluidVolumeM3: 0.00005,
    fluidHeightMeters: 0.085,
  },
  targets: [
    {
      id: "collar-left",
      label: "Left collar drain",
      effect: "primary-drain",
      localPosition: [-1.82, -0.08, 0],
      localRotation: [Math.PI / 2, Math.PI / 2, 0],
      markerDiameterScene: 0.29,
      holeDiameterScale: 0.78,
      holeElevationMeters: 0.1,
      wallThicknessMeters: 0.0034,
      stressMultiplier: 1.16,
    },
    {
      id: "collar-right",
      label: "Right collar drain",
      effect: "primary-drain",
      localPosition: [1.82, -0.08, 0],
      localRotation: [Math.PI / 2, Math.PI / 2, 0],
      markerDiameterScene: 0.29,
      holeDiameterScale: 0.78,
      holeElevationMeters: 0.1,
      wallThicknessMeters: 0.0034,
      stressMultiplier: 1.16,
    },
    {
      id: "collar-neutral",
      label: "Neutral collar drain",
      effect: "primary-drain",
      localPosition: [0, -0.12, -1.82],
      localRotation: [Math.PI / 2, 0, 0],
      markerDiameterScene: 0.25,
      holeDiameterScale: 0.62,
      holeElevationMeters: 0.12,
      wallThicknessMeters: 0.0031,
      stressMultiplier: 1.23,
    },
    {
      id: "collar-relief",
      label: "Collar relief",
      effect: "pressure-relief",
      localPosition: [0.2, 0.27, 1.8],
      localRotation: [Math.PI / 2, 0, 0],
      markerDiameterScene: 0.24,
      holeDiameterScale: 0.36,
      holeElevationMeters: 0.35,
      wallThicknessMeters: 0.003,
      stressMultiplier: 1.26,
    },
  ],
};

export const SIXTH_LEVEL: LevelDefinition = {
  id: "gyro-nest",
  name: "Gyro Nest",
  objective:
    "Stabilize pressure, feed the receiver, expose and drain the nested vessel, then keep the released body near center.",
  initialSourceVolumeM3: 0.0096,
  sourceCapacityM3: 0.012,
  sourceHeightMeters: 0.52,
  sourceInletM3PerSecond: 0.00034,
  initialReceiverVolumeM3: 0.0056,
  receiverCapacityM3: 0.018,
  goal: {
    maxSourceFill01: 0.51,
    minReceiverFill01: 0.66,
    minInnerHeightScene: 2.08,
    minInnerXScene: -0.3,
    maxInnerXScene: 0.3,
    requireSecondaryHole: true,
    minSecondaryHeightScene: 2.76,
  },
  hostMotion: {
    lateralAmplitudeScene: 0.28,
    verticalAmplitudeScene: 0.08,
    rotationAmplitudeRadians: Math.PI * 0.82,
    frequencyHz: 0.21,
    phaseRadians: 1.05,
  },
  sourceRing: {
    diameterScene: 4.12,
    thicknessScene: 0.14,
    localY: 0.04,
    tiltRadians: 0.48,
  },
  nestedVessel: {
    enabled: true,
    radiusScene: 0.48,
    initialPosition: [0.7, 1.18, -0.18],
    baseMassKg: 0.13,
    fluidCapacityM3: 0.0005,
    initialFluidVolumeM3: 0.00043,
    fluidHeightMeters: 0.088,
  },
  targets: [
    {
      id: "gyro-main",
      label: "Gyro main drain",
      effect: "primary-drain",
      host: "source",
      localPosition: [-0.55, -0.14, -1.73],
      localRotation: [Math.PI / 2, 0, 0],
      markerDiameterScene: 0.24,
      holeDiameterScale: 0.78,
      holeElevationMeters: 0.1,
      wallThicknessMeters: 0.0032,
      stressMultiplier: 1.22,
    },
    {
      id: "gyro-counter",
      label: "Gyro counter drain",
      effect: "primary-drain",
      host: "source",
      localPosition: [1.78, -0.08, 0.3],
      localRotation: [Math.PI / 2, Math.PI / 2, 0],
      markerDiameterScene: 0.22,
      holeDiameterScale: 0.6,
      holeElevationMeters: 0.12,
      wallThicknessMeters: 0.003,
      stressMultiplier: 1.28,
    },
    {
      id: "gyro-relief",
      label: "Gyro relief",
      effect: "pressure-relief",
      host: "source",
      localPosition: [-1.72, 0.27, -0.42],
      localRotation: [Math.PI / 2, Math.PI / 2, 0],
      markerDiameterScene: 0.2,
      holeDiameterScale: 0.34,
      holeElevationMeters: 0.36,
      wallThicknessMeters: 0.0029,
      stressMultiplier: 1.3,
    },
    {
      id: "gyro-nested-release",
      label: "Gyro nested release",
      effect: "nested-drain",
      host: "nested",
      minHostHeightScene: 2.36,
      localPosition: [0.08, -0.04, -0.48],
      localRotation: [Math.PI / 2, 0, 0],
      markerDiameterScene: 0.21,
      holeDiameterScale: 0.58,
      holeElevationMeters: 0.013,
      wallThicknessMeters: 0.0028,
      stressMultiplier: 1.32,
    },
  ],
};

export const LEVELS: readonly LevelDefinition[] = [
  FIRST_LEVEL,
  SECOND_LEVEL,
  THIRD_LEVEL,
  FOURTH_LEVEL,
  FIFTH_LEVEL,
  SIXTH_LEVEL,
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
    if ((level.hostMotion.rotationAmplitudeRadians ?? 0) < 0) {
      errors.push("rotation amplitude cannot be negative");
    }
  }

  for (const target of level.targets) {
    if (ids.has(target.id)) errors.push(`duplicate target id: ${target.id}`);
    ids.add(target.id);
    if (target.holeDiameterScale <= 0) errors.push(`invalid diameter scale: ${target.id}`);
    if (target.wallThicknessMeters <= 0) errors.push(`invalid wall thickness: ${target.id}`);
    if (target.host === "nested" && !level.nestedVessel?.enabled) {
      errors.push(`nested target requires nested vessel: ${target.id}`);
    }
  }

  if (level.nestedAssembly && !level.nestedVessel?.enabled) {
    errors.push("nested assembly requires an enabled nested vessel");
  }

  if (level.sourceRing) {
    if (level.sourceRing.diameterScene <= 0) errors.push("ring diameter must be positive");
    if (level.sourceRing.thicknessScene <= 0) errors.push("ring thickness must be positive");
  }

  if (level.nestedVessel) {
    if (level.nestedVessel.radiusScene <= 0) errors.push("nested radius must be positive");
    if (level.nestedVessel.baseMassKg <= 0) errors.push("nested base mass must be positive");
    if (level.nestedVessel.fluidCapacityM3 <= 0) errors.push("nested fluid capacity must be positive");
    if (
      level.nestedVessel.initialFluidVolumeM3 < 0 ||
      level.nestedVessel.initialFluidVolumeM3 > level.nestedVessel.fluidCapacityM3
    ) {
      errors.push("nested initial fluid volume must fit capacity");
    }
  }

  return errors;
}
