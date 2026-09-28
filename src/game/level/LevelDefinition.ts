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
  nestedVessel?: NestedVesselDefinition;
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

export const THIRD_LEVEL: LevelDefinition = {
  id: "jet-routing",
  name: "Jet Routing",
  objective: "Drain and lift the inner vessel into the right-side routing zone.",
  initialSourceVolumeM3: 0.009,
  sourceCapacityM3: 0.012,
  sourceHeightMeters: 0.52,
  sourceInletM3PerSecond: 0.000038,
  initialReceiverVolumeM3: 0.007,
  receiverCapacityM3: 0.018,
  goal: {
    maxSourceFill01: 0.56,
    minReceiverFill01: 0.62,
    minInnerHeightScene: 2.02,
    minInnerXScene: 0.68,
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
  sourceInletM3PerSecond: 0.00004,
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
  sourceInletM3PerSecond: 0.000043,
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

export const LEVELS: readonly LevelDefinition[] = [
  FIRST_LEVEL,
  SECOND_LEVEL,
  THIRD_LEVEL,
  FOURTH_LEVEL,
  FIFTH_LEVEL,
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
