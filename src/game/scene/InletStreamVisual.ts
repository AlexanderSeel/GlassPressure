import {
  Mesh,
  MeshBuilder,
  PBRMaterial,
  Scene,
  Vector3,
} from "@babylonjs/core";
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
    this.path = Array.from({ length: 9 }, () => Vector3.Zero());
    this.stream = MeshBuilder.CreateTube(
      "animated-inlet-stream",
      {
        path: this.path,
        radius: 0.075,
        tessellation: 14,
        cap: Mesh.CAP_ALL,
        updatable: true,
      },
      scene,
    );
    this.stream.material = material;
    this.stream.visibility = 0.72;
    this.stream.isPickable = false;

    this.droplets = new FlowVisuals(
      scene,
      Math.max(10, particleBudget),
    );
  }

  public update(
    dtSeconds: number,
    timeSeconds: number,
    targetCenter: Vector3,
    surfaceY: number,
    inflowM3: number,
  ): Vector3 {
    const source = new Vector3(
      targetCenter.x + Math.sin(timeSeconds * 0.43) * 0.22,
      targetCenter.y + 3.1,
      targetCenter.z + Math.cos(timeSeconds * 0.37) * 0.18,
    );

    const impact = new Vector3(
      targetCenter.x +
        Math.sin(timeSeconds * 0.77) * 0.42 +
        Math.sin(timeSeconds * 1.91) * 0.08,
      surfaceY + 0.02,
      targetCenter.z +
        Math.cos(timeSeconds * 0.69) * 0.36 +
        Math.sin(timeSeconds * 1.43) * 0.07,
    );

    const count = this.path.length;
    for (let i = 0; i < count; i += 1) {
      const t = i / (count - 1);
      const point = Vector3.Lerp(source, impact, t);

      // Moving sideways bend plus a little gravity-driven narrowing/sway.
      const bend =
        Math.sin(timeSeconds * 1.45 + t * 5.2) *
        0.075 *
        Math.sin(Math.PI * t);
      const bend2 =
        Math.cos(timeSeconds * 1.12 + t * 4.1) *
        0.055 *
        Math.sin(Math.PI * t);

      point.x += bend;
      point.z += bend2;
      point.y -= t * t * 0.11;
      this.path[i]!.copyFrom(point);
    }

    MeshBuilder.CreateTube(
      "animated-inlet-stream",
      {
        path: this.path,
        radiusFunction: index => {
          const t = index / Math.max(1, count - 1);
          return 0.082 - t * 0.028;
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
      Math.max(inflowM3, 0.0000005),
      source.add(direction.scale(0.15)),
      direction,
    );

    return impact;
  }

  public reset(): void {
    this.droplets.reset();
  }

  public dispose(): void {
    this.droplets.dispose();
    this.stream.dispose();
  }
}
