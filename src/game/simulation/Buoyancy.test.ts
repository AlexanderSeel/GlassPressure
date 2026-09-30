import { describe, expect, it } from "vitest";
import {
  buoyancyForceNewtons,
  effectiveContainedLiquidWeightNewtons,
  sphereVolume,
  submergedCylinderFraction,
  submergedSphereFraction,
  submergedSphereVolume,
} from "./Buoyancy";

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


describe("effectiveContainedLiquidWeightNewtons", () => {
  it("scales contained liquid load without exceeding the requested coupling", () => {
    expect(effectiveContainedLiquidWeightNewtons(0.012, 1000, 0.16)).toBeCloseTo(18.8352, 4);
    expect(effectiveContainedLiquidWeightNewtons(0.012, 1000, 2)).toBeCloseTo(117.72, 4);
    expect(effectiveContainedLiquidWeightNewtons(-1, 1000, 0.5)).toBe(0);
  });
});


describe("submersion fractions", () => {
  it("clamps cylinder immersion to a stable 0..1 range", () => {
    expect(submergedCylinderFraction(0.1, 0)).toBe(0);
    expect(submergedCylinderFraction(0.1, 0.05)).toBeCloseTo(0.5, 8);
    expect(submergedCylinderFraction(0.1, 0.2)).toBe(1);
  });

  it("tracks sphere displaced-volume fraction", () => {
    expect(submergedSphereFraction(0.1, 0)).toBe(0);
    expect(submergedSphereFraction(0.1, 0.1)).toBeCloseTo(0.5, 8);
    expect(submergedSphereFraction(0.1, 0.2)).toBe(1);
  });
});
