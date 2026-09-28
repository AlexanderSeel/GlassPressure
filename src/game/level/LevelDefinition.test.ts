import { describe, expect, it } from "vitest";
import { FIRST_LEVEL, validateLevelDefinition } from "./LevelDefinition";

describe("LevelDefinition", () => {
  it("keeps the first level structurally valid", () => {
    expect(validateLevelDefinition(FIRST_LEVEL)).toEqual([]);
  });

  it("contains both a main drain and pressure-relief route", () => {
    expect(FIRST_LEVEL.targets.some(target => target.effect === "primary-drain")).toBe(true);
    expect(FIRST_LEVEL.targets.some(target => target.effect === "pressure-relief")).toBe(true);
  });
});
