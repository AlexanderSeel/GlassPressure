import { describe, expect, it } from "vitest";
import { Vector3 } from "@babylonjs/core";
import { predictJetImpact } from "./JetTrajectory";

describe("predictJetImpact", () => {
  it("finds a receiver impact for a horizontal jet under gravity", () => {
    const impact = predictJetImpact(
      new Vector3(0, 2, 0),
      new Vector3(1, 0, 0),
      1,
      1,
      1,
      3,
    );

    expect(impact).not.toBeNull();
    expect(impact?.position.y).toBeCloseTo(1);
    expect(impact?.position.x).toBeGreaterThan(1);
  });

  it("lands a downward jet sooner than a horizontal jet", () => {
    const horizontal = predictJetImpact(
      new Vector3(0, 2, 0),
      new Vector3(1, 0, 0),
      1,
      1,
      1,
      3,
    );
    const downward = predictJetImpact(
      new Vector3(0, 2, 0),
      new Vector3(1, -1, 0),
      1,
      1,
      1,
      3,
    );

    expect(downward?.timeSeconds ?? Infinity).toBeLessThan(
      horizontal?.timeSeconds ?? 0,
    );
  });

  it("returns null when the impact is beyond the allowed horizon", () => {
    const impact = predictJetImpact(
      new Vector3(0, 20, 0),
      new Vector3(1, 0, 0),
      0.1,
      0,
      0.1,
      0.2,
    );
    expect(impact).toBeNull();
  });
});
