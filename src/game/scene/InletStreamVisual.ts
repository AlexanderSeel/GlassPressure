import {
  Mesh,
  MeshBuilder,
  PBRMaterial,
  Scene,
  Vector3,
} from "@babylonjs/core";

export type InletStreamState = {
  impact: Vector3;
  direction: Vector3;
};
import { FlowVisuals } from "./FlowVisuals";

export class InletStreamVisual {
  private readonly stream: Mesh;
  private readonly droplets: FlowVisuals;
  private readonly path: Vector3[];

  public constructor(
    private readonly scene: Scene,
    material: PBRMaterial,
    particleBudget: number,
  ) {
    this.path = Array.from({ length: 10 }, () => Vector3.Zero());
    this.stream = MeshBuilder.CreateTube(
      "animated-inlet-stream",
      {
        path: this.path,
        radius: 0.07,
        tessellation: 14,
        cap: Mesh.CAP_ALL,
        updatable: true,
      },
      scene,
    );
    this.stream.material = material;
    this.stream.visibility = 0.58;
    this.stream.isPickable = false;
    this.droplets = new FlowVisuals(scene, Math.max(10, particleBudget));
  }

  public update(
    dtSeconds: number,
    timeSeconds: number,
    targetCenter: Vector3,
    surfaceY: number,
    inletM3: number,
  ): InletStreamState {
    const source = new Vector3(
      targetCenter.x + Math.sin(timeSeconds * 0.32) * 0.12,
      targetCenter.y + 3.0,
      targetCenter.z + Math.cos(timeSeconds * 0.27) * 0.1,
    );

    const impact = new Vector3(
      targetCenter.x +
        Math.sin(timeSeconds * 0.58) * 0.26 +
        Math.sin(timeSeconds * 1.27) * 0.045,
      surfaceY + 0.015,
      targetCenter.z +
        Math.cos(timeSeconds * 0.51) * 0.22 +
        Math.sin(timeSeconds * 1.11) * 0.04,
    );

    const count = this.path.length;
    for (let i = 0; i < count; i += 1) {
      const t = i / (count - 1);
      const point = Vector3.Lerp(source, impact, t);
      const envelope = Math.sin(Math.PI * t);

      point.x +=
        Math.sin(timeSeconds * 0.85 + t * 3.8) * 0.035 * envelope;
      point.z +=
        Math.cos(timeSeconds * 0.71 + t * 3.25) * 0.028 * envelope;
      point.y -= t * t * 0.08;
      this.path[i]!.copyFrom(point);
    }

    MeshBuilder.CreateTube(
      "animated-inlet-stream",
      {
        path: this.path,
        radiusFunction: index => {
          const t = index / Math.max(1, count - 1);
          return 0.072 - t * 0.022;
        },
        tessellation: 14,
        cap: Mesh.CAP_ALL,
        instance: this.stream,
      },
      this.scene,
    );

    const direction = impact.subtract(source).normalize();
    this.droplets.update(
      dtSeconds,
      Math.max(inletM3, 0.00000035),
      source.add(direction.scale(0.18)),
      direction,
    );

    return {
      impact,
      direction,
    };
  }

  public reset(): void {
    this.droplets.reset();
  }

  public dispose(): void {
    this.droplets.dispose();
    this.stream.dispose();
  }
}
