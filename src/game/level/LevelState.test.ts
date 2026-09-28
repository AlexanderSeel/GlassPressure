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

  it("does not win before a primary hole exists", () => {
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

  it("can require a secondary nested-vessel release", () => {
    const goal = {
      maxSourceFill01: 0.6,
      minReceiverFill01: 0.6,
      minInnerHeightScene: 2,
      requireSecondaryHole: true,
      minSecondaryHeightScene: 2.5,
    };

    expect(evaluateLevel({
      glassFailed: false,
      holeCreated: true,
      secondaryHoleCreated: false,
      sourceFill01: 0.5,
      receiverFill01: 0.7,
      innerHeightScene: 2.2,
      secondaryHeightScene: 2.8,
    }, goal)).toBe("playing");

    expect(evaluateLevel({
      glassFailed: false,
      holeCreated: true,
      secondaryHoleCreated: true,
      sourceFill01: 0.5,
      receiverFill01: 0.7,
      innerHeightScene: 2.2,
      secondaryHeightScene: 2.8,
    }, goal)).toBe("won");
  });

  it("can require the nested vessel to escape its parent cup", () => {
    const goal = {
      maxSourceFill01: 1,
      minReceiverFill01: 0.05,
      minInnerHeightScene: 2,
      requireSecondaryHole: true,
      minSecondaryHeightScene: 3,
      requireSecondaryEscaped: true,
    };

    expect(evaluateLevel({
      glassFailed: false,
      holeCreated: true,
      secondaryHoleCreated: true,
      secondaryEscaped: false,
      sourceFill01: 0.7,
      receiverFill01: 0.2,
      innerHeightScene: 3,
      secondaryHeightScene: 3.3,
    }, goal)).toBe("playing");

    expect(evaluateLevel({
      glassFailed: false,
      holeCreated: true,
      secondaryHoleCreated: true,
      secondaryEscaped: true,
      sourceFill01: 0.7,
      receiverFill01: 0.2,
      innerHeightScene: 3,
      secondaryHeightScene: 3.3,
    }, goal)).toBe("won");
  });
});
