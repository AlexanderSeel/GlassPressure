import { describe, expect, it } from "vitest";
import { parseQualityPreference, resolveQualityPreset, selectInitialQuality } from "./QualitySettings";

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

  it("parses invalid preferences as auto", () => {
    expect(parseQualityPreference("ultra")).toBe("auto");
    expect(parseQualityPreference("medium")).toBe("medium");
  });

  it("lets a manual preference override hardware detection", () => {
    expect(resolveQualityPreset("low", 32, 0, 1).tier).toBe("low");
    expect(resolveQualityPreset("auto", 32, 0, 1).tier).toBe("high");
  });
});
