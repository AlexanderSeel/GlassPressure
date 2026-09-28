import { describe, expect, it } from "vitest";
import { effectiveTargetPressurePa, targetProgressMultiplier } from "./TargetStrategy";

describe("TargetStrategy", () => {
  it("reduces effective main-target pressure after relief is opened", () => {
    expect(effectiveTargetPressurePa(5000, "primary-drain", true)).toBe(3600);
  });

  it("does not reduce pressure for the relief target itself", () => {
    expect(effectiveTargetPressurePa(5000, "pressure-relief", true)).toBe(5000);
  });

  it("slightly improves main drilling progress after pressure relief", () => {
    expect(targetProgressMultiplier("primary-drain", true)).toBeGreaterThan(1);
    expect(targetProgressMultiplier("primary-drain", false)).toBe(1);
  });
});
