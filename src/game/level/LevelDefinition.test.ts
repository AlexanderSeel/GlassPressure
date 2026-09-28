import { describe, expect, it } from "vitest";
import {
  FIRST_LEVEL,
  LEVELS,
  SECOND_LEVEL,
  validateLevelDefinition,
} from "./LevelDefinition";

describe("LevelDefinition", () => {
  it("keeps every handcrafted level structurally valid", () => {
    for (const level of LEVELS) {
      expect(validateLevelDefinition(level)).toEqual([]);
    }
  });

  it("contains both a main drain and pressure-relief route in level one", () => {
    expect(FIRST_LEVEL.targets.some(target => target.effect === "primary-drain")).toBe(true);
    expect(FIRST_LEVEL.targets.some(target => target.effect === "pressure-relief")).toBe(true);
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
});
