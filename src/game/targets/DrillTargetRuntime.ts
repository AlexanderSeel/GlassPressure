import {
  Color3,
  Mesh,
  MeshBuilder,
  Ray,
  Scene,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";
import type { DrillTargetDefinition } from "../level/LevelDefinition";

export class DrillTargetRuntime {
  public readonly marker: Mesh;
  public readonly material: StandardMaterial;
  public readonly cracks: Mesh;

  public progress01 = 0;
  public stress01 = 0;
  public holeCreated = false;

  public constructor(
    scene: Scene,
    private readonly host: Mesh,
    public readonly definition: DrillTargetDefinition,
  ) {
    this.marker = MeshBuilder.CreateTorus(
      `drill-target-${definition.id}`,
      {
        diameter: definition.markerDiameterScene,
        thickness: definition.effect === "pressure-relief" ? 0.045 : 0.055,
        tessellation: 48,
      },
      scene,
    );
    this.marker.parent = host;
    this.marker.position.copyFromFloats(...definition.localPosition);
    this.marker.rotation.copyFromFloats(...definition.localRotation);

    this.material = new StandardMaterial(
      `target-material-${definition.id}`,
      scene,
    );
    this.material.alpha = 0.82;
    this.marker.material = this.material;

    this.cracks = MeshBuilder.CreateLines(
      `target-cracks-${definition.id}`,
      {
        points: [
          new Vector3(0, 0, 0),
          new Vector3(-0.13, 0.12, 0),
          new Vector3(-0.04, 0.035, 0),
          new Vector3(0.14, 0.1, 0),
          new Vector3(0.025, 0.02, 0),
          new Vector3(0.1, -0.13, 0),
          new Vector3(0.015, -0.025, 0),
          new Vector3(-0.14, -0.1, 0),
        ],
      },
      scene,
    );
    this.cracks.parent = this.marker;
    this.cracks.color = new Color3(0.88, 0.95, 1);
    this.cracks.visibility = 0;
    this.cracks.isPickable = false;

    this.resetMaterial();
  }

  public alignment01(cameraPosition: Vector3): number {
    const targetPosition = this.marker.getAbsolutePosition();
    const approach = targetPosition.subtract(cameraPosition).normalize();
    const normal = this.surfaceNormal(cameraPosition);
    return Math.min(1, Math.max(0, Vector3.Dot(approach, normal.scale(-1))));
  }

  public surfaceNormal(cameraPosition: Vector3): Vector3 {
    const targetPosition = this.marker.getAbsolutePosition();
    const toTarget = targetPosition.subtract(cameraPosition);
    const length = Math.max(0.001, toTarget.length());

    const ray = new Ray(
      cameraPosition,
      toTarget.scale(1 / length),
      length + 2,
    );
    const hit = this.host.intersects(ray, false);
    const hitNormal = hit.hit ? hit.getNormal(true, true) : null;

    if (hitNormal && hitNormal.lengthSquared() > 0.0001) {
      return hitNormal.normalize();
    }

    const fallback = targetPosition.subtract(this.host.getAbsolutePosition());
    fallback.y = 0;
    return fallback.lengthSquared() > 0.0001
      ? fallback.normalize()
      : new Vector3(0, 0, -1);
  }

  public updateVisual(failed: boolean): void {
    const reveal = Math.min(
      1,
      Math.max(0, (this.stress01 - 0.22) / 0.58),
    );
    this.cracks.visibility = reveal;

    if (failed || this.holeCreated) return;

    if (this.definition.effect === "pressure-relief") {
      this.material.emissiveColor = new Color3(
        0.68 + reveal * 0.2,
        0.24 - reveal * 0.12,
        0.02,
      );
    } else {
      this.material.emissiveColor = new Color3(
        0.04 + reveal * 0.42,
        0.6 - reveal * 0.34,
        0.95 - reveal * 0.55,
      );
    }
  }

  public showFailure(): void {
    this.material.diffuseColor = new Color3(0.75, 0.08, 0.06);
    this.material.emissiveColor = new Color3(0.8, 0.03, 0.02);
    this.cracks.visibility = 1;
  }

  public reset(): void {
    this.progress01 = 0;
    this.stress01 = 0;
    this.holeCreated = false;
    this.marker.scaling.setAll(1);
    this.cracks.visibility = 0;
    this.resetMaterial();
  }

  private resetMaterial(): void {
    if (this.definition.effect === "pressure-relief") {
      this.material.diffuseColor = new Color3(0.95, 0.52, 0.09);
      this.material.emissiveColor = new Color3(0.68, 0.24, 0.02);
    } else {
      this.material.diffuseColor = new Color3(0.08, 0.8, 1);
      this.material.emissiveColor = new Color3(0.04, 0.6, 0.95);
    }
  }
}
