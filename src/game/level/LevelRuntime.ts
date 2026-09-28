import type { LevelDefinition } from "./LevelDefinition";
import { evaluateLevel, type LevelPhase, type LevelSnapshot } from "./LevelState";

export type HostOffset = {
  x: number;
  y: number;
  rotationY: number;
};

export class LevelRuntime {
  public phase: LevelPhase = "playing";
  public elapsedSeconds = 0;
  private index = 0;

  public constructor(private readonly levels: readonly LevelDefinition[]) {
    if (levels.length === 0) {
      throw new Error("LevelRuntime requires at least one level");
    }
  }

  public get level(): LevelDefinition {
    return this.levels[this.index]!;
  }

  public get levelNumber(): number {
    return this.index + 1;
  }

  public next(): LevelDefinition {
    this.index = (this.index + 1) % this.levels.length;
    this.reset();
    return this.level;
  }

  public reset(): void {
    this.phase = "playing";
    this.elapsedSeconds = 0;
  }

  public fail(): void {
    this.phase = "failed";
  }

  public evaluate(snapshot: LevelSnapshot): LevelPhase {
    if (this.phase !== "playing") return this.phase;
    this.phase = evaluateLevel(snapshot, this.level.goal);
    return this.phase;
  }

  public advance(dtSeconds: number): HostOffset {
    this.elapsedSeconds += Math.max(0, Math.min(dtSeconds, 0.05));
    const motion = this.level.hostMotion;
    if (!motion) return { x: 0, y: 0, rotationY: 0 };

    const angle =
      this.elapsedSeconds * Math.PI * 2 * motion.frequencyHz +
      motion.phaseRadians;
    const verticalAngle = angle * 1.37 + motion.phaseRadians * 0.5;

    return {
      x: Math.sin(angle) * motion.lateralAmplitudeScene,
      y: Math.sin(verticalAngle) * motion.verticalAmplitudeScene,
      rotationY:
        Math.sin(angle * 0.73 + motion.phaseRadians) *
        (motion.rotationAmplitudeRadians ?? 0),
    };
  }
}
