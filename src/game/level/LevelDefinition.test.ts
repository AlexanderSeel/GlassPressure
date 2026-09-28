import { describe, expect, it } from "vitest";
import {
  FIRST_LEVEL,
  FIFTH_LEVEL,
  FOURTH_LEVEL,
  LEVELS,
  SECOND_LEVEL,
  SIXTH_LEVEL,
  THIRD_LEVEL,
  validateLevelDefinition,
} from "./LevelDefinition";

describe("LevelDefinition", () => {
  it("keeps every handcrafted level structurally valid", () => {
    for (const level of LEVELS) {
      expect(validateLevelDefinition(level)).toEqual([]);
    }
  });

  it("makes level one prove the original nested-lift concept", () => {
    expect(FIRST_LEVEL.nestedAssembly).toBe(true);
    expect(FIRST_LEVEL.goal.requireSecondaryHole).toBe(true);
    expect(FIRST_LEVEL.goal.requireSecondaryEscaped).toBe(true);
    expect(FIRST_LEVEL.targets.some(target => target.effect === "primary-drain")).toBe(true);
    expect(FIRST_LEVEL.targets.some(target => target.effect === "nested-drain")).toBe(true);
  });

  it("makes level two a moving, tighter challenge", () => {
    expect(SECOND_LEVEL.hostMotion).toBeDefined();
    expect(SECOND_LEVEL.sourceInletM3PerSecond).toBeGreaterThan(
      FIRST_LEVEL.sourceInletM3PerSecond,
    );
    expect(SECOND_LEVEL.targets[0]?.markerDiameterScene).toBeLessThan(
      FIRST_LEVEL.targets[0]?.markerDiameterScene ?? Infinity,
    );
  });

  it("makes level three require lateral jet routing", () => {
    expect(THIRD_LEVEL.goal.minInnerXScene).toBeGreaterThan(0);
    expect(
      THIRD_LEVEL.targets.filter(target => target.effect === "primary-drain"),
    ).toHaveLength(2);
  });

  it("makes level four require a buoyancy-exposed nested release", () => {
    expect(FOURTH_LEVEL.nestedVessel?.enabled).toBe(true);
    expect(FOURTH_LEVEL.goal.requireSecondaryHole).toBe(true);
    const nestedTarget = FOURTH_LEVEL.targets.find(target => target.host === "nested");
    expect(nestedTarget?.effect).toBe("nested-drain");
    expect(nestedTarget?.minHostHeightScene).toBeGreaterThan(2);
  });

  it("makes level five a rotating collar challenge", () => {
    expect(FIFTH_LEVEL.sourceRing).toBeDefined();
    expect(FIFTH_LEVEL.hostMotion?.rotationAmplitudeRadians).toBeGreaterThan(1);
    expect(FIFTH_LEVEL.goal.minInnerXScene).toBeLessThan(0);
    expect(FIFTH_LEVEL.goal.maxInnerXScene).toBeGreaterThan(0);
  });

  it("makes level six combine rotation, pressure and nested release", () => {
    expect(SIXTH_LEVEL.nestedVessel?.enabled).toBe(true);
    expect(SIXTH_LEVEL.sourceRing).toBeDefined();
    expect(SIXTH_LEVEL.goal.requireSecondaryHole).toBe(true);
    expect(SIXTH_LEVEL.hostMotion?.rotationAmplitudeRadians).toBeGreaterThan(2);
    expect(SIXTH_LEVEL.targets.some(target => target.effect === "pressure-relief")).toBe(true);
    expect(SIXTH_LEVEL.targets.some(target => target.effect === "nested-drain")).toBe(true);
  });
});
