export type DrillState =
  | "idle"
  | "approach"
  | "contact"
  | "drilling"
  | "breakthrough"
  | "retract";

export class DrillController {
  public state: DrillState = "idle";
  public extension = 0;
  public contactTimeSeconds = 0;
  private triggerHeld = false;
  private breakthroughTimeSeconds = 0;

  public press(): void {
    this.triggerHeld = true;
    if (this.state === "idle" || this.state === "retract") this.state = "approach";
  }

  public release(): void {
    this.triggerHeld = false;
    if (this.state !== "idle" && this.state !== "breakthrough") this.state = "retract";
  }

  public notifyBreakthrough(): void {
    this.state = "breakthrough";
    this.breakthroughTimeSeconds = 0;
    this.triggerHeld = false;
  }

  public step(dtSeconds: number, targetAvailable: boolean): void {
    const dt = Math.max(0, Math.min(dtSeconds, 0.05));

    switch (this.state) {
      case "idle":
        this.extension = Math.max(0, this.extension - dt * 3.5);
        break;
      case "approach":
        if (!this.triggerHeld || !targetAvailable) {
          this.state = "retract";
          break;
        }
        this.extension = Math.min(1, this.extension + dt * 2.4);
        if (this.extension >= 0.98) {
          this.state = "contact";
          this.contactTimeSeconds = 0;
        }
        break;
      case "contact":
        if (!this.triggerHeld || !targetAvailable) {
          this.state = "retract";
          break;
        }
        this.contactTimeSeconds += dt;
        if (this.contactTimeSeconds >= 0.12) this.state = "drilling";
        break;
      case "drilling":
        if (!this.triggerHeld || !targetAvailable) this.state = "retract";
        break;
      case "breakthrough":
        this.breakthroughTimeSeconds += dt;
        if (this.breakthroughTimeSeconds >= 0.18) this.state = "retract";
        break;
      case "retract":
        this.extension = Math.max(0, this.extension - dt * 3.2);
        if (this.extension <= 0.01) {
          this.extension = 0;
          this.state = "idle";
        }
        break;
    }
  }

  public reset(): void {
    this.state = "idle";
    this.extension = 0;
    this.contactTimeSeconds = 0;
    this.triggerHeld = false;
    this.breakthroughTimeSeconds = 0;
  }

  public get isDrilling(): boolean {
    return this.state === "drilling";
  }
}
