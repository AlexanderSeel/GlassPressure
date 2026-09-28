export type LevelPhase = "playing" | "won" | "failed";

export type LevelSnapshot = {
  glassFailed: boolean;
  holeCreated: boolean;
  sourceFill01: number;
  receiverFill01: number;
  innerHeightScene: number;
};

export type LevelGoal = {
  maxSourceFill01: number;
  minReceiverFill01: number;
  minInnerHeightScene: number;
};

export const FIRST_LEVEL_GOAL: LevelGoal = {
  maxSourceFill01: 0.58,
  minReceiverFill01: 0.62,
  minInnerHeightScene: 2.02,
};

export function evaluateLevel(
  snapshot: LevelSnapshot,
  goal: LevelGoal = FIRST_LEVEL_GOAL,
): LevelPhase {
  if (snapshot.glassFailed) return "failed";

  const complete =
    snapshot.holeCreated &&
    snapshot.sourceFill01 <= goal.maxSourceFill01 &&
    snapshot.receiverFill01 >= goal.minReceiverFill01 &&
    snapshot.innerHeightScene >= goal.minInnerHeightScene;

  return complete ? "won" : "playing";
}
