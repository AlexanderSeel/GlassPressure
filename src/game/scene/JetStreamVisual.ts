import {
  Mesh,
  MeshBuilder,
  PBRMaterial,
  Scene,
  Vector3,
} from "@babylonjs/core";

export class JetStreamVisual {
  private readonly stream: Mesh;
  private readonly splash: Mesh;
  private pulseSeconds = 0;

  public constructor(scene: Scene, material: PBRMaterial) {
    this.stream = MeshBuilder.CreateCylinder(
      "pressure-jet",
      {
        diameterTop: 0.05,
        diameterBottom: 0.12,
        height: 1,
        tessellation: 18,
      },
      scene,
    );
    this.stream.material = material;
    this.stream.visibility = 0;
    this.stream.isPickable = false;

    this.splash = MeshBuilder.CreateTorus(
      "receiver-splash",
      {
        diameter: 0.34,
        thickness: 0.035,
        tessellation: 28,
      },
      scene,
    );
    this.splash.material = material;
    this.splash.visibility = 0;
    this.splash.isPickable = false;
  }

  public update(
    dtSeconds: number,
    outflowM3: number,
    origin: Vector3 | null,
    direction: Vector3 | null,
    receiverSurfaceY: number,
  ): void {
    this.pulseSeconds += Math.max(0, Math.min(dtSeconds, 0.05));

    if (!origin || !direction || outflowM3 <= 0) {
      this.hide();
      return;
    }

    const normal = direction.lengthSquared() > 0.001
      ? direction.normalize()
      : new Vector3(0, 0, -1);

    const flowMlPerSecond = outflowM3 * 60_000_000;
    const strength = Math.min(1, Math.max(0, flowMlPerSecond / 120));
    const pulse = 1 + Math.sin(this.pulseSeconds * 15) * 0.045 * strength;
    const length = (0.25 + strength * 1.55) * pulse;

    this.stream.visibility = 0.22 + strength * 0.78;
    this.stream.scaling.copyFromFloats(
      0.72 + strength * 0.38,
      length,
      0.72 + strength * 0.38,
    );
    this.stream.position.copyFrom(origin.add(normal.scale(length * 0.5)));
    this.stream.lookAt(origin.add(normal.scale(length + 1)));
    this.stream.rotate(Vector3.Right(), Math.PI / 2);

    const downward = normal.y < -0.08;
    const toSurface = downward
      ? (receiverSurfaceY - origin.y) / normal.y
      : length;
    const travel = Math.min(2.2, Math.max(0.25, toSurface));
    const impact = origin.add(normal.scale(travel));
    impact.y = receiverSurfaceY + 0.015;

    this.splash.position.copyFrom(impact);
    this.splash.visibility = strength * 0.72;
    const splashScale =
      (0.6 + strength * 1.2) *
      (1 + Math.sin(this.pulseSeconds * 11) * 0.08);
    this.splash.scaling.copyFromFloats(splashScale, 0.4, splashScale);
  }

  public reset(): void {
    this.pulseSeconds = 0;
    this.hide();
    this.stream.scaling.setAll(1);
    this.splash.scaling.setAll(1);
  }

  private hide(): void {
    this.stream.visibility = 0;
    this.splash.visibility = 0;
  }
}
