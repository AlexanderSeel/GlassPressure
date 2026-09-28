import {
  Color3,
  InstancedMesh,
  MeshBuilder,
  PBRMaterial,
  Scene,
  Vector3,
} from "@babylonjs/core";

type FlowParticle = {
  mesh: InstancedMesh;
  ageSeconds: number;
  lifetimeSeconds: number;
  velocity: Vector3;
};

export class FlowVisuals {
  private readonly particles: FlowParticle[] = [];
  private readonly prototype;
  private spawnAccumulator = 0;
  private sequence = 0;

  public constructor(scene: Scene, poolSize = 24) {
    this.prototype = MeshBuilder.CreateSphere(
      "flow-particle-prototype",
      { diameter: 0.075, segments: 8 },
      scene,
    );

    const material = new PBRMaterial("flow-particle-material", scene);
    material.albedoColor = new Color3(0.35, 0.8, 0.98);
    material.emissiveColor = new Color3(0.02, 0.08, 0.12);
    material.roughness = 0.12;
    material.alpha = 0.62;
    this.prototype.material = material;
    this.prototype.isPickable = false;
    this.prototype.setEnabled(false);

    for (let i = 0; i < poolSize; i += 1) {
      const mesh = this.prototype.createInstance(`flow-particle-${i}`);
      mesh.isPickable = false;
      mesh.setEnabled(false);
      this.particles.push({
        mesh,
        ageSeconds: 0,
        lifetimeSeconds: 0,
        velocity: Vector3.Zero(),
      });
    }
  }

  public update(
    dtSeconds: number,
    outflowM3: number,
    origin: Vector3 | null,
    direction: Vector3 | null,
  ): void {
    const dt = Math.max(0, Math.min(dtSeconds, 0.05));

    for (const particle of this.particles) {
      if (!particle.mesh.isEnabled()) continue;

      particle.ageSeconds += dt;
      if (particle.ageSeconds >= particle.lifetimeSeconds) {
        particle.mesh.setEnabled(false);
        continue;
      }

      particle.velocity.y -= 0.55 * dt;
      particle.mesh.position.addInPlace(particle.velocity.scale(dt));

      const remaining = 1 - particle.ageSeconds / particle.lifetimeSeconds;
      particle.mesh.scaling.setAll(0.55 + remaining * 0.65);
    }

    if (!origin || !direction || outflowM3 <= 0) return;

    const flowMlPerSecond = outflowM3 * 60_000_000;
    const spawnRate = Math.min(28, Math.max(0, flowMlPerSecond / 5));
    this.spawnAccumulator += spawnRate * dt;

    while (this.spawnAccumulator >= 1) {
      this.spawnAccumulator -= 1;
      if (!this.spawn(origin, direction, flowMlPerSecond)) break;
    }
  }

  public reset(): void {
    this.spawnAccumulator = 0;
    for (const particle of this.particles) particle.mesh.setEnabled(false);
  }

  public dispose(): void {
    for (const particle of this.particles) particle.mesh.dispose();
    this.prototype.material?.dispose();
    this.prototype.dispose();
  }

  private spawn(origin: Vector3, direction: Vector3, flowMlPerSecond: number): boolean {
    const particle = this.particles.find(candidate => !candidate.mesh.isEnabled());
    if (!particle) return false;

    const normal = direction.normalize();
    const tangent = Vector3.Cross(normal, Vector3.Up());
    if (tangent.lengthSquared() < 0.001) tangent.copyFrom(Vector3.Right());
    tangent.normalize();
    const bitangent = Vector3.Cross(normal, tangent).normalize();

    const phase = this.sequence * 2.399963229728653;
    const ring = 0.025 + (this.sequence % 4) * 0.012;
    const offset = tangent
      .scale(Math.cos(phase) * ring)
      .add(bitangent.scale(Math.sin(phase) * ring));

    const strength = Math.min(1, flowMlPerSecond / 120);
    const speed = 0.75 + strength * 1.4;

    particle.mesh.position.copyFrom(origin.add(offset));
    particle.mesh.scaling.setAll(0.7);
    particle.mesh.setEnabled(true);
    particle.ageSeconds = 0;
    particle.lifetimeSeconds = 0.45 + (this.sequence % 5) * 0.07;
    particle.velocity.copyFrom(
      normal
        .scale(speed)
        .add(tangent.scale(Math.sin(phase * 1.7) * 0.14))
        .add(bitangent.scale(Math.cos(phase * 1.3) * 0.14))
        .add(new Vector3(0, 0.08, 0)),
    );

    this.sequence += 1;
    return true;
  }
}
