export type LevelPhase = "playing" | "won" | "failed";

export type LevelSnapshot = {
  glassFailed: boolean;
  holeCreated: boolean;
  sourceFill01: number;
  receiverFill01: number;
  innerHeightScene: number;
  innerXScene?: number;
  secondaryHoleCreated?: boolean;
  secondaryHeightScene?: number;
  secondaryEscaped?: boolean;
};

export type LevelGoal = {
  maxSourceFill01: number;
  minReceiverFill01: number;
  minInnerHeightScene: number;
  minInnerXScene?: number;
  maxInnerXScene?: number;
  requireSecondaryHole?: boolean;
  minSecondaryHeightScene?: number;
  requireSecondaryEscaped?: boolean;
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

  const innerX = snapshot.innerXScene ?? 0;
  const xWithinGoal =
    (goal.minInnerXScene === undefined || innerX >= goal.minInnerXScene) &&
    (goal.maxInnerXScene === undefined || innerX <= goal.maxInnerXScene);

  const secondarySatisfied =
    (!goal.requireSecondaryHole || snapshot.secondaryHoleCreated === true) &&
    (goal.minSecondaryHeightScene === undefined ||
      (snapshot.secondaryHeightScene ?? Number.NEGATIVE_INFINITY) >=
        goal.minSecondaryHeightScene) &&
    (!goal.requireSecondaryEscaped || snapshot.secondaryEscaped === true);

  const complete =
    snapshot.holeCreated &&
    snapshot.sourceFill01 <= goal.maxSourceFill01 &&
    snapshot.receiverFill01 >= goal.minReceiverFill01 &&
    snapshot.innerHeightScene >= goal.minInnerHeightScene &&
    xWithinGoal &&
    secondarySatisfied;

  return complete ? "won" : "playing";
}
