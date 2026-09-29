import {
  Color3,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  Scene,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";

type Particle = {
  mesh: Mesh;
  velocity: Vector3;
  life: number;
  maxLife: number;
  bubble: boolean;
};

export class WaterContactVisual {
  private readonly ring: Mesh;
  private readonly ringMaterial: StandardMaterial;
  private readonly splashRing: Mesh;
  private readonly splashMaterial: StandardMaterial;
  private readonly particles: Particle[] = [];

  private previousSignedDistance = Number.NaN;
  private splashTime = 0;
  private particleCursor = 0;

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

    const dropletMaterial = new PBRMaterial(
      `${name}-droplet-material`,
      scene,
    );
    dropletMaterial.albedoColor = new Color3(0.18, 0.58, 0.72);
    dropletMaterial.emissiveColor = new Color3(0.025, 0.08, 0.1);
    dropletMaterial.metallic = 0;
    dropletMaterial.roughness = 0.08;
    dropletMaterial.alpha = 0.68;

    for (let i = 0; i < 28; i += 1) {
      const mesh = MeshBuilder.CreateSphere(
        `${name}-water-particle-${i}`,
        {
          diameter: 0.028 + (i % 4) * 0.008,
          segments: 6,
        },
        scene,
      );
      mesh.material = dropletMaterial;
      mesh.isPickable = false;
      mesh.setEnabled(false);
      this.particles.push({
        mesh,
        velocity: Vector3.Zero(),
        life: 0,
        maxLife: 0,
        bubble: false,
      });
    }
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
      1 -
        Math.abs(signedDistance) /
          Math.max(0.001, this.bodyRadius * 1.1),
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
      ? Math.min(
          0.52,
          0.14 + contact01 * 0.28 + horizontalSpeed * 0.05,
        )
      : 0;

    const crossedSurface =
      Number.isFinite(this.previousSignedDistance) &&
      this.previousSignedDistance * signedDistance < 0 &&
      verticalSpeed > 0.08;

    if (crossedSurface) {
      this.splashTime = Math.min(1, 0.35 + verticalSpeed * 0.22);
      const entering = velocity.y < 0;
      this.spawnBurst(
        bodyPosition,
        waterSurfaceY,
        velocity,
        entering,
      );
    }
    this.previousSignedDistance = signedDistance;

    this.splashTime = Math.max(0, this.splashTime - dt * 1.65);
    if (this.splashTime > 0) {
      const phase = 1 - this.splashTime;
      const scale =
        0.9 + phase * (1.35 + verticalSpeed * 0.08);

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

    this.updateParticles(dt, waterSurfaceY);
  }

  public reset(): void {
    this.previousSignedDistance = Number.NaN;
    this.splashTime = 0;
    this.ringMaterial.alpha = 0;
    this.splashMaterial.alpha = 0;

    for (const particle of this.particles) {
      particle.mesh.setEnabled(false);
      particle.life = 0;
      particle.maxLife = 0;
      particle.velocity.copyFromFloats(0, 0, 0);
    }
  }

  private spawnBurst(
    bodyPosition: Vector3,
    waterSurfaceY: number,
    bodyVelocity: Vector3,
    entering: boolean,
  ): void {
    const count = entering ? 12 : 8;

    for (let i = 0; i < count; i += 1) {
      const particle = this.particles[this.particleCursor]!;
      this.particleCursor =
        (this.particleCursor + 1) % this.particles.length;

      const angle =
        (i / count) * Math.PI * 2 + this.particleCursor * 0.37;
      const radial =
        this.bodyRadius * (0.35 + (i % 4) * 0.12);

      particle.mesh.position.copyFromFloats(
        bodyPosition.x + Math.cos(angle) * radial,
        waterSurfaceY + (entering ? -0.015 : 0.025),
        bodyPosition.z + Math.sin(angle) * radial,
      );

      if (entering && i % 3 === 0) {
        particle.bubble = true;
        particle.velocity.copyFromFloats(
          Math.cos(angle) * 0.08,
          0.22 + (i % 4) * 0.035,
          Math.sin(angle) * 0.08,
        );
        particle.maxLife = 0.85 + (i % 3) * 0.12;
      } else {
        particle.bubble = false;
        const outward = 0.22 + (i % 5) * 0.035;
        particle.velocity.copyFromFloats(
          Math.cos(angle) * outward + bodyVelocity.x * 0.08,
          0.34 + Math.abs(bodyVelocity.y) * 0.12 + (i % 4) * 0.045,
          Math.sin(angle) * outward + bodyVelocity.z * 0.08,
        );
        particle.maxLife = 0.42 + (i % 4) * 0.055;
      }

      particle.life = particle.maxLife;
      particle.mesh.scaling.setAll(1);
      particle.mesh.setEnabled(true);
    }
  }

  private updateParticles(
    dt: number,
    waterSurfaceY: number,
  ): void {
    for (const particle of this.particles) {
      if (!particle.mesh.isEnabled()) continue;

      particle.life -= dt;
      if (particle.life <= 0) {
        particle.mesh.setEnabled(false);
        continue;
      }

      if (particle.bubble) {
        particle.velocity.y += 0.12 * dt;
        particle.velocity.x *= Math.exp(-dt * 1.8);
        particle.velocity.z *= Math.exp(-dt * 1.8);

        if (particle.mesh.position.y >= waterSurfaceY - 0.015) {
          particle.mesh.setEnabled(false);
          continue;
        }
      } else {
        particle.velocity.y -= 2.25 * dt;
        if (
          particle.mesh.position.y < waterSurfaceY - 0.02 &&
          particle.velocity.y < 0
        ) {
          particle.mesh.setEnabled(false);
          continue;
        }
      }

      particle.mesh.position.addInPlace(
        particle.velocity.scale(dt),
      );

      const life01 =
        particle.maxLife > 0
          ? clamp01(particle.life / particle.maxLife)
          : 0;
      const scale = particle.bubble
        ? 0.5 + (1 - life01) * 0.5
        : 0.3 + life01 * 0.7;
      particle.mesh.scaling.setAll(scale);
    }
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
