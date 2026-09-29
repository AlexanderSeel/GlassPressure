import { describe, expect, it } from "vitest";
import {
  receiverSurfaceWorldY,
  sourceSurfaceLocalY,
  sourceWaterHeightScene,
} from "./WaterLevels";

describe("WaterLevels", () => {
  it("uses exactly the same source height for volume and surface", () => {
    const fill = 0.63;
    expect(sourceSurfaceLocalY(fill)).toBeCloseTo(
      -0.86 + sourceWaterHeightScene(fill),
      12,
    );
  });

  it("clamps receiver surface to a small visible minimum", () => {
    expect(receiverSurfaceWorldY(0.2, 0)).toBeCloseTo(0.225);
  });

  it("rises monotonically with fill", () => {
    expect(sourceSurfaceLocalY(0.8)).toBeGreaterThan(
      sourceSurfaceLocalY(0.2),
    );
    expect(receiverSurfaceWorldY(0.2, 0.8)).toBeGreaterThan(
      receiverSurfaceWorldY(0.2, 0.2),
    );
  });
});
