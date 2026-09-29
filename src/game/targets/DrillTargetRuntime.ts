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
  public readonly boreMark: Mesh;
  public readonly material: StandardMaterial;

  private readonly crackBranches: LinesMesh[] = [];
  private readonly hitMaterial: StandardMaterial;
  private readonly boreMaterial: StandardMaterial;

  public progress01 = 0;
  public stress01 = 0;
  public holeCreated = false;
  public fluidHoleIndex: number | null = null;

  private hovered = false;
  private drillingActive = false;
  private breakthroughPulse = 0;

  public constructor(
    scene: Scene,
    private readonly host: Mesh,
    public readonly definition: DrillTargetDefinition,
  ) {
    this.marker = MeshBuilder.CreateTorus(
      `drill-target-${definition.id}`,
      {
        diameter: definition.markerDiameterScene,
        thickness: definition.effect === "pressure-relief" ? 0.04 : 0.05,
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
    this.material.alpha = 0.68;
    this.marker.material = this.material;

    this.hitMaterial = new StandardMaterial(
      `target-hit-material-${definition.id}`,
      scene,
    );
    this.hitMaterial.alpha = 0.045;
    this.hitMaterial.disableLighting = true;

    this.hitArea = MeshBuilder.CreateCylinder(
      `target-hit-area-${definition.id}`,
      {
        diameter: definition.markerDiameterScene * 0.82,
        height: 0.022,
        tessellation: 48,
      },
      scene,
    );
    this.hitArea.parent = this.marker;
    this.hitArea.position.y = 0.008;
    this.hitArea.material = this.hitMaterial;
    this.hitArea.isPickable = true;

    this.boreMaterial = new StandardMaterial(
      `target-bore-material-${definition.id}`,
      scene,
    );
    this.boreMaterial.diffuseColor = new Color3(0.015, 0.02, 0.024);
    this.boreMaterial.emissiveColor = new Color3(0.01, 0.014, 0.016);
    this.boreMaterial.alpha = 0.0;
    this.boreMaterial.disableLighting = false;

    this.boreMark = MeshBuilder.CreateCylinder(
      `target-bore-${definition.id}`,
      {
        diameter: definition.markerDiameterScene * 0.34,
        height: 0.032,
        tessellation: 32,
      },
      scene,
    );
    this.boreMark.parent = this.marker;
    this.boreMark.position.y = 0.015;
    this.boreMark.material = this.boreMaterial;
    this.boreMark.isPickable = false;
    this.boreMark.scaling.copyFromFloats(0.08, 1, 0.08);

    this.createCracks(scene);
    this.resetMaterial();
  }

  public ownsPickedMesh(mesh: Mesh | null | undefined): boolean {
    return mesh === this.marker || mesh === this.hitArea;
  }

  public setHovered(hovered: boolean): void {
    this.hovered = hovered && this.isHeightAccessible && !this.holeCreated;
  }

  public setDrillingActive(active: boolean): void {
    this.drillingActive = active && !this.holeCreated;
  }

  public notifyBreakthrough(): void {
    this.breakthroughPulse = 0.2;
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

  public outletNormal(): Vector3 {
    const targetPosition = this.marker.getAbsolutePosition();
    const fallback = targetPosition.subtract(this.host.getAbsolutePosition());
    if (fallback.lengthSquared() > 0.0001) return fallback.normalize();
    return new Vector3(0, 0, -1);
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

    return this.outletNormal();
  }

  public updateVisual(failed: boolean, dtSeconds = 1 / 60): void {
    const dt = Math.max(0, Math.min(dtSeconds, 0.05));
    this.breakthroughPulse = Math.max(0, this.breakthroughPulse - dt);

    const progress = clamp01(this.progress01);
    const stress = clamp01(this.stress01);
    const crackAmount = clamp01(progress * 0.68 + stress * 0.72);

    this.updateCracks(crackAmount);

    if (this.holeCreated) {
      const pulse = this.breakthroughPulse > 0
        ? Math.sin((this.breakthroughPulse / 0.2) * Math.PI) * 0.28
        : 0;

      this.marker.visibility = 0.5 + pulse;
      this.marker.scaling.setAll(0.62 + pulse * 0.3);
      this.hitArea.visibility = 0;
      this.boreMaterial.alpha = 0.96;
      this.boreMark.scaling.setAll(0.85 + pulse * 0.5);
      return;
    }

    const boreVisible = progress > 0.002 || this.drillingActive;
    this.boreMaterial.alpha = boreVisible
      ? 0.28 + progress * 0.5 + (this.drillingActive ? 0.18 : 0)
      : 0;
    const boreScale = 0.08 + Math.pow(progress, 0.72) * 0.58;
    this.boreMark.scaling.copyFromFloats(boreScale, 1, boreScale);

    if (failed) return;

    if (!this.isHeightAccessible) {
      this.material.alpha = 0.22;
      this.hitArea.visibility = 0.025;
      this.material.diffuseColor = new Color3(0.22, 0.27, 0.3);
      this.material.emissiveColor = new Color3(0.02, 0.03, 0.035);
      return;
    }

    this.material.alpha = this.hovered ? 0.9 : 0.64;
    this.hitArea.visibility = this.hovered ? 0.12 : 0.04;

    const drillPulse = this.drillingActive
      ? 0.12 + Math.sin(performance.now() * 0.045) * 0.05
      : 0;
    const hoverBoost = this.hovered ? 0.12 : 0;

    if (this.definition.effect === "pressure-relief") {
      this.hitMaterial.diffuseColor = new Color3(0.95, 0.52, 0.09);
      this.material.emissiveColor = new Color3(
        0.55 + hoverBoost + drillPulse,
        0.18 + drillPulse * 0.3,
        0.01,
      );
    } else if (this.definition.effect === "nested-drain") {
      this.hitMaterial.diffuseColor = new Color3(0.62, 0.18, 0.9);
      this.material.emissiveColor = new Color3(
        0.34 + hoverBoost + drillPulse,
        0.05,
        0.58 + hoverBoost + drillPulse,
      );
    } else {
      this.hitMaterial.diffuseColor = new Color3(0.08, 0.8, 1);
      this.material.emissiveColor = new Color3(
        0.025 + hoverBoost + drillPulse,
        0.45 + hoverBoost + drillPulse,
        0.76 + hoverBoost + drillPulse,
      );
    }
  }

  public showFailure(): void {
    this.material.diffuseColor = new Color3(0.75, 0.08, 0.06);
    this.material.emissiveColor = new Color3(0.8, 0.03, 0.02);
    for (const crack of this.crackBranches) crack.visibility = 1;
  }

  public dispose(): void {
    for (const crack of this.crackBranches) crack.dispose();
    this.boreMark.dispose();
    this.boreMaterial.dispose();
    this.hitArea.dispose();
    this.hitMaterial.dispose();
    this.marker.dispose();
    this.material.dispose();
  }

  public reset(): void {
    this.progress01 = 0;
    this.stress01 = 0;
    this.holeCreated = false;
    this.fluidHoleIndex = null;
    this.hovered = false;
    this.drillingActive = false;
    this.breakthroughPulse = 0;
    this.marker.scaling.setAll(1);
    this.marker.visibility = 1;
    this.hitArea.visibility = 0.04;
    this.boreMaterial.alpha = 0;
    this.boreMark.scaling.copyFromFloats(0.08, 1, 0.08);
    for (const crack of this.crackBranches) {
      crack.visibility = 0;
      crack.scaling.setAll(0.05);
    }
    this.resetMaterial();
  }

  private createCracks(scene: Scene): void {
    const branchAngles = [-2.65, -1.95, -1.15, -0.35, 0.48, 1.25, 2.15];
    const branchLengths = [0.92, 0.68, 0.82, 0.58, 0.88, 0.72, 0.62];

    for (let i = 0; i < branchAngles.length; i += 1) {
      const angle = branchAngles[i]!;
      const length = this.definition.markerDiameterScene * 0.46 * branchLengths[i]!;
      const bend = (i % 2 === 0 ? 1 : -1) * 0.17;

      const points = [
        new Vector3(0, 0.022, 0),
        new Vector3(
          Math.cos(angle) * length * 0.34,
          0.023,
          Math.sin(angle) * length * 0.34,
        ),
        new Vector3(
          Math.cos(angle + bend) * length * 0.68,
          0.024,
          Math.sin(angle + bend) * length * 0.68,
        ),
        new Vector3(
          Math.cos(angle - bend * 0.45) * length,
          0.025,
          Math.sin(angle - bend * 0.45) * length,
        ),
      ];

      const crack = MeshBuilder.CreateLines(
        `target-crack-${this.definition.id}-${i}`,
        { points },
        scene,
      );
      crack.parent = this.marker;
      crack.color = new Color3(0.82, 0.93, 0.98);
      crack.alpha = 0.68;
      crack.isPickable = false;
      crack.visibility = 0;
      crack.scaling.setAll(0.05);
      this.crackBranches.push(crack);
    }
  }

  private updateCracks(amount: number): void {
    const branchCount = this.crackBranches.length;
    for (let i = 0; i < branchCount; i += 1) {
      const crack = this.crackBranches[i]!;
      const threshold = i / (branchCount + 2);
      const local = clamp01((amount - threshold) * 2.2);
      crack.visibility = local > 0.015 ? Math.min(0.92, 0.25 + local * 0.67) : 0;
      crack.scaling.setAll(0.08 + local * 0.92);
    }
  }

  private resetMaterial(): void {
    this.material.alpha = 0.64;
    if (this.definition.effect === "pressure-relief") {
      this.material.diffuseColor = new Color3(0.95, 0.52, 0.09);
      this.material.emissiveColor = new Color3(0.55, 0.18, 0.01);
    } else if (this.definition.effect === "nested-drain") {
      this.material.diffuseColor = new Color3(0.62, 0.18, 0.9);
      this.material.emissiveColor = new Color3(0.34, 0.05, 0.58);
    } else {
      this.material.diffuseColor = new Color3(0.08, 0.8, 1);
      this.material.emissiveColor = new Color3(0.025, 0.45, 0.76);
    }
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
