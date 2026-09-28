import { describe, expect, it } from "vitest";
import { FluidSystem, type FluidCompartment } from "./FluidSystem";

function vessel(): FluidCompartment {
  return {
    id: "test",
    capacityM3: 0.01,
    volumeM3: 0.009,
    heightMeters: 0.4,
    densityKgM3: 1000,
    inletM3PerSecond: 0,
    holes: [],
  };
}

describe("FluidSystem", () => {
  it("preserves volume without inlet or holes", () => {
    const model = vessel();
    const system = new FluidSystem();
    system.step(model, 1 / 60);
    expect(model.volumeM3).toBeCloseTo(0.009);
  });

  it("drains through a submerged hole", () => {
    const model = vessel();
    const system = new FluidSystem();
    system.addHole(model, 0.01, 0.05);
    system.step(model, 0.05);
    expect(model.volumeM3).toBeLessThan(0.009);
  });

  it("larger holes drain faster", () => {
    const small = vessel();
    const large = vessel();
    const system = new FluidSystem();
    system.addHole(small, 0.004, 0.05);
    system.addHole(large, 0.012, 0.05);
    system.step(small, 0.05);
    system.step(large, 0.05);
    expect(large.volumeM3).toBeLessThan(small.volumeM3);
  });

  it("reports overflow instead of deleting excess inlet water", () => {
    const model = vessel();
    model.volumeM3 = 0.0099;
    model.inletM3PerSecond = 0.01;

    const result = new FluidSystem().step(model, 0.05);

    expect(model.volumeM3).toBeCloseTo(model.capacityM3);
    expect(result.overflowM3).toBeGreaterThan(0);
    expect(result.overflowM3 + model.volumeM3).toBeCloseTo(0.0104);
  });
});
