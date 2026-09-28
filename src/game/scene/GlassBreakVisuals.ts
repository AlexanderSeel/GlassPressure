import {
  Color3,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  PhysicsAggregate,
  PhysicsShapeType,
  Scene,
  Vector3,
} from "@babylonjs/core";

type Fragment = {
  mesh: Mesh;
  aggregate: PhysicsAggregate;
  ageSeconds: number;
  lifetimeSeconds: number;
};

export class GlassBreakVisuals {
  private readonly fragments: Fragment[] = [];
  private readonly material: PBRMaterial;

  public constructor(
    private readonly scene: Scene,
    private readonly fragmentBudget: number,
  ) {
    this.material = new PBRMaterial("broken-glass-material", scene);
    this.material.albedoColor = new Color3(0.74, 0.9, 0.96);
    this.material.metallic = 0;
    this.material.roughness = 0.12;
    this.material.alpha = 0.38;
    this.material.backFaceCulling = false;
  }

  public spawn(origin: Vector3, surfaceNormal: Vector3): void {
    const normal = surfaceNormal.lengthSquared() > 0.001
      ? surfaceNormal.normalize()
      : new Vector3(0, 0, -1);

    const tangent = Vector3.Cross(normal, Vector3.Up());
    if (tangent.lengthSquared() < 0.001) tangent.copyFrom(Vector3.Right());
    tangent.normalize();
    const bitangent = Vector3.Cross(normal, tangent).normalize();

    const fragmentsThisBreak = Math.max(
      2,
      Math.min(this.fragmentBudget, Math.ceil(this.fragmentBudget * 0.6)),
    );

    for (let i = 0; i < fragmentsThisBreak; i += 1) {
      while (this.fragments.length >= this.fragmentBudget) {
        this.disposeFragment(this.fragments.shift()!);
      }
      const phase = i * 2.399963229728653;
      const width = 0.075 + (i % 3) * 0.026;
      const height = 0.1 + (i % 4) * 0.024;

      const mesh = MeshBuilder.CreateBox(
        `glass-fragment-${i}`,
        {
          width,
          height,
          depth: 0.024 + (i % 2) * 0.008,
        },
        this.scene,
      );
      mesh.material = this.material;
      mesh.isPickable = false;

      const ring = 0.035 + (i % 4) * 0.022;
      mesh.position.copyFrom(
        origin
          .add(tangent.scale(Math.cos(phase) * ring))
          .add(bitangent.scale(Math.sin(phase) * ring))
          .add(normal.scale(0.025)),
      );
      mesh.rotation.copyFromFloats(
        phase * 0.27,
        phase * 0.41,
        phase * 0.19,
      );

      const aggregate = new PhysicsAggregate(
        mesh,
        PhysicsShapeType.BOX,
        {
          mass: 0.009 + (i % 3) * 0.003,
          friction: 0.28,
          restitution: 0.16,
        },
        this.scene,
      );

      const impulse = normal
        .scale(0.035 + (i % 4) * 0.008)
        .add(tangent.scale(Math.cos(phase) * 0.018))
        .add(bitangent.scale(Math.sin(phase) * 0.018))
        .add(Vector3.Up().scale(0.012 + (i % 3) * 0.004));

      aggregate.body.applyImpulse(impulse, mesh.getAbsolutePosition());
      this.fragments.push({
        mesh,
        aggregate,
        ageSeconds: 0,
        lifetimeSeconds: 1.9 + (i % 4) * 0.32,
      });
    }
  }

  public update(dtSeconds: number): void {
    const dt = Math.max(0, Math.min(dtSeconds, 0.05));

    for (let i = this.fragments.length - 1; i >= 0; i -= 1) {
      const fragment = this.fragments[i]!;
      fragment.ageSeconds += dt;

      if (
        fragment.ageSeconds >= fragment.lifetimeSeconds ||
        fragment.mesh.getAbsolutePosition().y < -4
      ) {
        this.disposeFragment(fragment);
        this.fragments.splice(i, 1);
      }
    }
  }

  public clear(): void {
    for (const fragment of this.fragments) {
      this.disposeFragment(fragment);
    }
    this.fragments.length = 0;
  }

  private disposeFragment(fragment: Fragment): void {
    fragment.aggregate.dispose();
    fragment.mesh.dispose();
  }
}
