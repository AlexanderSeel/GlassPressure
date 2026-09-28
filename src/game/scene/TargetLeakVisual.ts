import { PBRMaterial, Scene, Vector3 } from "@babylonjs/core";
import { FlowVisuals } from "./FlowVisuals";
import { JetStreamVisual } from "./JetStreamVisual";

export class TargetLeakVisual {
  private readonly jet: JetStreamVisual;
  private readonly droplets: FlowVisuals;

  public constructor(
    scene: Scene,
    waterMaterial: PBRMaterial,
    particleBudget: number,
  ) {
    this.jet = new JetStreamVisual(scene, waterMaterial);
    this.droplets = new FlowVisuals(scene, particleBudget);
  }

  public update(
    dtSeconds: number,
    outflowM3: number,
    origin: Vector3,
    direction: Vector3,
    receiverSurfaceY: number,
  ): void {
    this.jet.update(
      dtSeconds,
      outflowM3,
      origin,
      direction,
      receiverSurfaceY,
    );
    this.droplets.update(
      dtSeconds,
      outflowM3,
      origin,
      direction,
    );
  }

  public hide(dtSeconds: number): void {
    this.jet.update(dtSeconds, 0, null, null, 0);
    this.droplets.update(dtSeconds, 0, null, null);
  }

  public reset(): void {
    this.jet.reset();
    this.droplets.reset();
  }

  public dispose(): void {
    this.jet.dispose();
    this.droplets.dispose();
  }
}
