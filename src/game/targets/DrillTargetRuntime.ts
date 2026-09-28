import {
  Color3,
  LinesMesh,
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
  public readonly hitArea: Mesh;
  public readonly progressFill: Mesh;
  public readonly material: StandardMaterial;
  public readonly cracks: LinesMesh;

  public progress01 = 0;
  public stress01 = 0;
  public holeCreated = false;
  private hovered = false;

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

    const hitMaterial = new StandardMaterial(
      `target-hit-material-${definition.id}`,
      scene,
    );
    hitMaterial.alpha = 0.16;
    hitMaterial.disableLighting = true;

    this.hitArea = MeshBuilder.CreateCylinder(
      `target-hit-area-${definition.id}`,
      {
        diameter: definition.markerDiameterScene * 0.84,
        height: 0.025,
        tessellation: 48,
      },
      scene,
    );
    this.hitArea.parent = this.marker;
    this.hitArea.position.y = 0.008;
    this.hitArea.material = hitMaterial;
    this.hitArea.isPickable = true;

    const progressMaterial = new StandardMaterial(
      `target-progress-material-${definition.id}`,
      scene,
    );
    progressMaterial.alpha = 0.72;
    progressMaterial.disableLighting = true;

    this.progressFill = MeshBuilder.CreateCylinder(
      `target-progress-${definition.id}`,
      {
        diameter: definition.markerDiameterScene * 0.68,
        height: 0.031,
        tessellation: 48,
      },
      scene,
    );
    this.progressFill.parent = this.marker;
    this.progressFill.position.y = 0.014;
    this.progressFill.material = progressMaterial;
    this.progressFill.isPickable = false;
    this.progressFill.scaling.copyFromFloats(0.05, 1, 0.05);
    this.progressFill.visibility = 0;

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

  public ownsPickedMesh(mesh: Mesh | null | undefined): boolean {
    return mesh === this.marker || mesh === this.hitArea;
  }

  public setHovered(hovered: boolean): void {
    this.hovered = hovered && this.isHeightAccessible && !this.holeCreated;
  }

  public get isHeightAccessible(): boolean {
    const minHeight = this.definition.minHostHeightScene;
    return minHeight === undefined || this.host.getAbsolutePosition().y >= minHeight;
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

    const visualProgress = Math.min(1, Math.max(0, this.progress01));
    this.progressFill.visibility =
      !this.holeCreated && visualProgress > 0.005 ? 0.78 : 0;
    const progressScale = 0.05 + visualProgress * 0.95;
    this.progressFill.scaling.copyFromFloats(
      progressScale,
      1,
      progressScale,
    );

    if (failed || this.holeCreated) return;

    if (!this.isHeightAccessible) {
      this.material.alpha = 0.28;
      this.hitArea.visibility = 0.06;
      this.material.diffuseColor = new Color3(0.22, 0.27, 0.3);
      this.material.emissiveColor = new Color3(0.02, 0.03, 0.035);
      return;
    }

    this.material.alpha = this.hovered ? 1 : 0.82;
    this.hitArea.visibility = this.hovered ? 0.34 : 0.18;
    const hoverBoost = this.hovered ? 0.18 : 0;

    if (this.definition.effect === "pressure-relief") {
      const base = new Color3(0.95, 0.52, 0.09);
      this.hitArea.material!.alpha = this.hovered ? 0.32 : 0.16;
      (this.hitArea.material as StandardMaterial).diffuseColor = base;
      (this.progressFill.material as StandardMaterial).diffuseColor =
        new Color3(1, 0.76, 0.18);
      this.material.emissiveColor = new Color3(
        0.68 + reveal * 0.2 + hoverBoost,
        0.24 - reveal * 0.12 + hoverBoost * 0.35,
        0.02,
      );
    } else if (this.definition.effect === "nested-drain") {
      const base = new Color3(0.62, 0.18, 0.9);
      (this.hitArea.material as StandardMaterial).diffuseColor = base;
      (this.progressFill.material as StandardMaterial).diffuseColor =
        new Color3(0.82, 0.38, 1);
      this.material.emissiveColor = new Color3(
        0.42 + reveal * 0.25 + hoverBoost,
        0.08 + hoverBoost * 0.2,
        0.72 - reveal * 0.28 + hoverBoost,
      );
    } else {
      const base = new Color3(0.08, 0.8, 1);
      (this.hitArea.material as StandardMaterial).diffuseColor = base;
      (this.progressFill.material as StandardMaterial).diffuseColor =
        new Color3(0.2, 0.92, 1);
      this.material.emissiveColor = new Color3(
        0.04 + reveal * 0.42 + hoverBoost,
        0.6 - reveal * 0.34 + hoverBoost,
        0.95 - reveal * 0.55 + hoverBoost,
      );
    }
  }

  public showFailure(): void {
    this.material.diffuseColor = new Color3(0.75, 0.08, 0.06);
    this.material.emissiveColor = new Color3(0.8, 0.03, 0.02);
    this.cracks.visibility = 1;
  }

  public dispose(): void {
    this.cracks.dispose();
    this.progressFill.material?.dispose();
    this.progressFill.dispose();
    this.hitArea.material?.dispose();
    this.hitArea.dispose();
    this.marker.dispose();
    this.material.dispose();
  }

  public reset(): void {
    this.progress01 = 0;
    this.stress01 = 0;
    this.holeCreated = false;
    this.hovered = false;
    this.marker.scaling.setAll(1);
    this.marker.visibility = 1;
    this.hitArea.visibility = 0.18;
    this.progressFill.visibility = 0;
    this.progressFill.scaling.copyFromFloats(0.05, 1, 0.05);
    this.cracks.visibility = 0;
    this.resetMaterial();
  }

  private resetMaterial(): void {
    this.material.alpha = 0.82;
    if (this.definition.effect === "pressure-relief") {
      this.material.diffuseColor = new Color3(0.95, 0.52, 0.09);
      this.material.emissiveColor = new Color3(0.68, 0.24, 0.02);
    } else if (this.definition.effect === "nested-drain") {
      this.material.diffuseColor = new Color3(0.62, 0.18, 0.9);
      this.material.emissiveColor = new Color3(0.42, 0.08, 0.72);
    } else {
      this.material.diffuseColor = new Color3(0.08, 0.8, 1);
      this.material.emissiveColor = new Color3(0.04, 0.6, 0.95);
    }
  }
}
