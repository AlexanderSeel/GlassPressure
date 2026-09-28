import { describe, expect, it } from "vitest";
import { drillingEfficiency, stepGlassStress } from "./GlassStress";

const safeInput = {
  drilling: true,
  alignment01: 1,
  steadiness01: 1,
  diameterMeters: 0.006,
  localPressurePa: 3000,
  wallThicknessMeters: 0.004,
  nearbyDamage01: 0,
};

describe("GlassStress", () => {
  it("recovers slowly while not drilling", () => {
    const result = stepGlassStress(0.5, { ...safeInput, drilling: false }, 0.05);
    expect(result.stress01).toBeLessThan(0.5);
  });

  it("bad alignment grows stress faster", () => {
    const aligned = stepGlassStress(0, safeInput, 0.05);
    const skewed = stepGlassStress(0, { ...safeInput, alignment01: 0.25 }, 0.05);
    expect(skewed.stress01).toBeGreaterThan(aligned.stress01);
  });

  it("poor steadiness reduces drilling efficiency", () => {
    expect(drillingEfficiency(1, 0.2)).toBeLessThan(drillingEfficiency(1, 1));
  });

  it("poor alignment strongly reduces drilling efficiency", () => {
    expect(drillingEfficiency(0.35, 1)).toBeLessThan(0.4);
  });
});
