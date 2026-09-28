import { describe, expect, it } from "vitest";
import { evaluateLevel } from "./LevelState";

describe("LevelState", () => {
  it("fails immediately when protected glass breaks", () => {
    expect(evaluateLevel({
      glassFailed: true,
      holeCreated: true,
      sourceFill01: 0,
      receiverFill01: 1,
      innerHeightScene: 3,
    })).toBe("failed");
  });

  it("does not win before a hole exists", () => {
    expect(evaluateLevel({
      glassFailed: false,
      holeCreated: false,
      sourceFill01: 0.2,
      receiverFill01: 0.9,
      innerHeightScene: 2.5,
    })).toBe("playing");
  });

  it("wins when drain, receiver and lift goals are met", () => {
    expect(evaluateLevel({
      glassFailed: false,
      holeCreated: true,
      sourceFill01: 0.5,
      receiverFill01: 0.7,
      innerHeightScene: 2.2,
    })).toBe("won");
  });
});
