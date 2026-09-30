import { describe, expect, it } from "vitest";
import { pickDominantWaterDisturbance } from "./WaterDisturbance";

describe("pickDominantWaterDisturbance", () => {
  it("prefers the body with the strongest speed/radius water disturbance", () => {
    const result = pickDominantWaterDisturbance([
      {
        x: 1,
        z: 0,
        velocityX: 0.2,
        velocityY: 0,
        velocityZ: 0,
        radiusScene: 0.6,
      },
      {
        x: -1,
        z: 0,
        velocityX: 0.6,
        velocityY: 0,
        velocityZ: 0,
        radiusScene: 0.25,
      },
    ]);

    expect(result?.x).toBe(-1);
  });

  it("returns null for an empty water body", () => {
    expect(pickDominantWaterDisturbance([])).toBeNull();
  });
});
