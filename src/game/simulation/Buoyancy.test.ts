import { describe, expect, it } from "vitest";
import { buoyancyForceNewtons, sphereVolume, submergedSphereVolume } from "./Buoyancy";

describe("Buoyancy", () => {
  it("returns zero volume when the sphere is dry", () => {
    expect(submergedSphereVolume(0.1, 0)).toBe(0);
  });

  it("returns half the sphere volume at half immersion", () => {
    const radius = 0.1;
    expect(submergedSphereVolume(radius, radius)).toBeCloseTo(sphereVolume(radius) / 2, 10);
  });

  it("clamps to full sphere volume", () => {
    const radius = 0.1;
    expect(submergedSphereVolume(radius, 1)).toBeCloseTo(sphereVolume(radius), 10);
  });

  it("converts displaced water to upward force", () => {
    expect(buoyancyForceNewtons(1000, 0.001)).toBeCloseTo(9.81, 8);
  });
});
