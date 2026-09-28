import { describe, expect, it } from "vitest";
import { selectInitialQuality } from "./QualitySettings";

describe("QualitySettings", () => {
  it("uses low quality for constrained devices", () => {
    expect(selectInitialQuality(4, 5, 3).tier).toBe("low");
  });

  it("uses medium quality for mid-range hardware", () => {
    expect(selectInitialQuality(8, 0, 1).tier).toBe("medium");
  });

  it("uses high quality for strong desktop hardware", () => {
    expect(selectInitialQuality(16, 0, 1).tier).toBe("high");
  });
});
