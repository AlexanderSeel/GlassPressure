import {
  Color3,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  Scene,
  Vector3,
} from "@babylonjs/core";

type Particle = {
  mesh: Mesh;
  velocity: Vector3;
  life: number;
};

export class DrillContactVisual {
  private readonly particles: Particle[] = [];
  private cursor = 0;
  private accumulator = 0;

  public constructor(
    scene: Scene,
    poolSize = 18,
  ) {
    const material = new PBRMaterial("drill-contact-debris-material", scene);
    material.albedoColor = new Color3(0.78, 0.88, 0.92);
    material.emissiveColor = new Color3(0.12, 0.18, 0.2);
    material.roughness = 0.24;
    material.metallic = 0.18;

    for (let i = 0; i < poolSize; i += 1) {
      const mesh = MeshBuilder.CreateSphere(
        `drill-contact-debris-${i}`,
        { diameter: 0.018 + (i % 3) * 0.006, segments: 6 },
        scene,
      );
      mesh.material = material;
      mesh.isPickable = false;
      mesh.setEnabled(false);
      this.particles.push({
        mesh,
        velocity: Vector3.Zero(),
        life: 0,
      });
    }
  }

  public update(
    dtSeconds: number,
    active: boolean,
    position: Vector3 | null,
    normal: Vector3 | null,
    intensity01: number,
  ): void {
    const dt = Math.max(0, Math.min(dtSeconds, 0.05));
    const intensity = Math.min(1, Math.max(0, intensity01));

    this.accumulator += active ? dt * (12 + intensity * 18) : 0;
    while (
      active &&
      position &&
      normal &&
      this.accumulator >= 1
    ) {
      this.accumulator -= 1;
      this.spawn(position, normal, intensity);
    }

    for (const particle of this.particles) {
      if (!particle.mesh.isEnabled()) continue;

      particle.life -= dt;
      if (particle.life <= 0) {
        particle.mesh.setEnabled(false);
        continue;
      }

      particle.velocity.y -= 1.8 * dt;
      particle.velocity.scaleInPlace(Math.exp(-dt * 1.6));
      particle.mesh.position.addInPlace(
        particle.velocity.scale(dt),
      );
      particle.mesh.scaling.setAll(
        Math.max(0.15, particle.life / 0.42),
      );
    }
  }

  public reset(): void {
    this.accumulator = 0;
    for (const particle of this.particles) {
      particle.mesh.setEnabled(false);
      particle.life = 0;
      particle.velocity.copyFromFloats(0, 0, 0);
    }
  }

  private spawn(
    position: Vector3,
    normal: Vector3,
    intensity: number,
  ): void {
    const particle = this.particles[this.cursor]!;
    this.cursor = (this.cursor + 1) % this.particles.length;

    const phase = this.cursor * 1.618;
    const tangent = new Vector3(
      Math.sin(phase),
      Math.cos(phase * 1.3) * 0.45,
      Math.cos(phase),
    ).normalize();

    particle.mesh.position.copyFrom(
      position.add(normal.scale(0.025)),
    );
    particle.velocity.copyFrom(
      normal
        .scale(0.28 + intensity * 0.22)
        .add(tangent.scale(0.16 + intensity * 0.18)),
    );
    particle.life = 0.28 + (this.cursor % 4) * 0.035;
    particle.mesh.scaling.setAll(1);
    particle.mesh.setEnabled(true);
  }
}
