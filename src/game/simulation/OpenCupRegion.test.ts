import { describe, expect, it } from "vitest";
import { hasEscapedOpenCupLocal, isPointInsideOpenCupLocal } from "./OpenCupRegion";

describe("open cup local region", () => {
  it("keeps water ownership stable in cup-local coordinates", () => {
    expect(isPointInsideOpenCupLocal({ x: 0.4, y: 0.2, z: -0.3 }, 1.72, -0.86, 0.86)).toBe(true);
    expect(isPointInsideOpenCupLocal({ x: 1.7, y: 0.2, z: 0 }, 1.72, -0.86, 0.86)).toBe(false);
    expect(isPointInsideOpenCupLocal({ x: 0, y: -1.3, z: 0 }, 1.72, -0.86, 0.86)).toBe(false);
  });

  it("only marks a nested body escaped after clearing the local rim region", () => {
    expect(hasEscapedOpenCupLocal({ x: 1.5, y: 1.2, z: 0 }, 2.0, -0.86)).toBe(false);
    expect(hasEscapedOpenCupLocal({ x: 2.05, y: 1.2, z: 0 }, 2.0, -0.86)).toBe(true);
    expect(hasEscapedOpenCupLocal({ x: 0, y: -1.25, z: 0 }, 2.0, -0.86)).toBe(true);
  });
});
