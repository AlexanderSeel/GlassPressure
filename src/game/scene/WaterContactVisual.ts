import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";

export class WaterContactVisual {
  private readonly ring: Mesh;
  private readonly ringMaterial: StandardMaterial;
  private readonly splashRing: Mesh;
  private readonly splashMaterial: StandardMaterial;

  private previousSignedDistance = Number.NaN;
  private splashTime = 0;

  public constructor(
    scene: Scene,
    name: string,
    private readonly bodyRadius: number,
  ) {
    this.ring = MeshBuilder.CreateTorus(
      `${name}-meniscus`,
      {
        diameter: bodyRadius * 1.95,
        thickness: Math.max(0.018, bodyRadius * 0.055),
        tessellation: 48,
      },
      scene,
    );
    this.ring.isPickable = false;

    this.ringMaterial = new StandardMaterial(
      `${name}-meniscus-material`,
      scene,
    );
    this.ringMaterial.disableLighting = true;
    this.ringMaterial.diffuseColor = new Color3(0.5, 0.88, 0.96);
    this.ringMaterial.emissiveColor = new Color3(0.12, 0.34, 0.42);
    this.ringMaterial.alpha = 0;
    this.ring.material = this.ringMaterial;

    this.splashRing = MeshBuilder.CreateTorus(
      `${name}-splash-ring`,
      {
        diameter: bodyRadius * 2.1,
        thickness: Math.max(0.014, bodyRadius * 0.04),
        tessellation: 48,
      },
      scene,
    );
    this.splashRing.isPickable = false;

    this.splashMaterial = new StandardMaterial(
      `${name}-splash-material`,
      scene,
    );
    this.splashMaterial.disableLighting = true;
    this.splashMaterial.diffuseColor = new Color3(0.62, 0.92, 1);
    this.splashMaterial.emissiveColor = new Color3(0.16, 0.42, 0.52);
    this.splashMaterial.alpha = 0;
    this.splashRing.material = this.splashMaterial;
  }

  public update(
    dtSeconds: number,
    bodyPosition: Vector3,
    velocity: Vector3,
    waterSurfaceY: number,
  ): void {
    const dt = Math.max(0, Math.min(dtSeconds, 0.05));
    const signedDistance = bodyPosition.y - waterSurfaceY;
    const immersion = this.bodyRadius - signedDistance;
    const contact01 = clamp01(
      1 - Math.abs(signedDistance) / Math.max(0.001, this.bodyRadius * 1.1),
    );

    const horizontalSpeed = Math.hypot(velocity.x, velocity.z);
    const verticalSpeed = Math.abs(velocity.y);

    this.ring.position.copyFromFloats(
      bodyPosition.x,
      waterSurfaceY + 0.008,
      bodyPosition.z,
    );

    const wakeStretch = Math.min(0.55, horizontalSpeed * 0.22);
    const wakeAngle = Math.atan2(velocity.x, velocity.z);
    this.ring.rotation.y = wakeAngle;
    this.ring.scaling.copyFromFloats(
      1 + wakeStretch,
      1,
      Math.max(0.72, 1 - wakeStretch * 0.55),
    );

    const visibleContact =
      immersion > -this.bodyRadius * 0.08 &&
      immersion < this.bodyRadius * 2.08;
    this.ringMaterial.alpha = visibleContact
      ? Math.min(0.52, 0.14 + contact01 * 0.28 + horizontalSpeed * 0.05)
      : 0;

    const crossedSurface =
      Number.isFinite(this.previousSignedDistance) &&
      this.previousSignedDistance * signedDistance < 0 &&
      verticalSpeed > 0.08;

    if (crossedSurface) {
      this.splashTime = Math.min(1, 0.35 + verticalSpeed * 0.22);
    }
    this.previousSignedDistance = signedDistance;

    this.splashTime = Math.max(0, this.splashTime - dt * 1.65);
    if (this.splashTime > 0) {
      const phase = 1 - this.splashTime;
      const scale = 0.9 + phase * (1.35 + verticalSpeed * 0.08);

      this.splashRing.position.copyFromFloats(
        bodyPosition.x,
        waterSurfaceY + 0.012,
        bodyPosition.z,
      );
      this.splashRing.scaling.copyFromFloats(scale, 1, scale);
      this.splashMaterial.alpha =
        Math.sin(Math.min(1, phase) * Math.PI) * 0.46;
    } else {
      this.splashMaterial.alpha = 0;
    }
  }

  public reset(): void {
    this.previousSignedDistance = Number.NaN;
    this.splashTime = 0;
    this.ringMaterial.alpha = 0;
    this.splashMaterial.alpha = 0;
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
