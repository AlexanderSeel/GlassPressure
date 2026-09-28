export class FixedStepRunner {
  private accumulatorSeconds = 0;

  public constructor(
    public readonly stepSeconds = 1 / 60,
    private readonly maxCatchUpSteps = 5,
  ) {}

  public advance(frameSeconds: number, step: (dtSeconds: number) => void): number {
    const safeFrame = Math.max(0, Math.min(frameSeconds, this.stepSeconds * this.maxCatchUpSteps));
    this.accumulatorSeconds += safeFrame;

    let steps = 0;
    while (this.accumulatorSeconds >= this.stepSeconds && steps < this.maxCatchUpSteps) {
      step(this.stepSeconds);
      this.accumulatorSeconds -= this.stepSeconds;
      steps += 1;
    }

    if (steps === this.maxCatchUpSteps && this.accumulatorSeconds >= this.stepSeconds) {
      this.accumulatorSeconds %= this.stepSeconds;
    }

    return steps;
  }

  public reset(): void {
    this.accumulatorSeconds = 0;
  }
}
