import {
  Mesh,
  MeshBuilder,
  Scene,
  ShaderMaterial,
  TransformNode,
  Vector3,
  VertexBuffer,
} from "@babylonjs/core";

export type WaterSurfaceUpdate = {
  surfaceY: number;
  fill01: number;
  agitation01: number;
  velocityX?: number;
  velocityZ?: number;
  inlet01?: number;
  disturbanceX?: number;
  disturbanceZ?: number;
  disturbance01?: number;
  cameraPosition: Vector3;
  timeSeconds: number;
  dtSeconds: number;
};

type SurfaceDisturbance = {
  x: number;
  z: number;
  strength: number;
  age: number;
};

export class WaterSurfaceVisual {
  public readonly mesh: Mesh;

  private readonly basePositions: number[];
  private readonly radius: number;
  private readonly waveAmplitude: number;
  private readonly disturbances: SurfaceDisturbance[] = [];

  private tiltX = 0;
  private tiltZ = 0;
  private tiltVelocityX = 0;
  private tiltVelocityZ = 0;
  private rippleCooldown = 0;

  public constructor(
    scene: Scene,
    name: string,
    radius: number,
    private readonly material: ShaderMaterial,
    parent: TransformNode | null = null,
    segments = 64,
    waveAmplitude = 0.045,
  ) {
    this.radius = radius;
    this.waveAmplitude = waveAmplitude;

    this.mesh = MeshBuilder.CreateDisc(
      name,
      {
        radius,
        tessellation: segments,
        sideOrientation: Mesh.DOUBLESIDE,
      },
      scene,
    );
    this.mesh.rotation.x = Math.PI / 2;
    this.mesh.material = material;
    this.mesh.isPickable = false;
    this.mesh.parent = parent;
    this.mesh.visibility = 0.9;

    const positions =
      this.mesh.getVerticesData(VertexBuffer.PositionKind) ?? [];
    this.basePositions = [...positions];
  }

  public update(state: WaterSurfaceUpdate): void {
    const fill = clamp01(state.fill01);
    const agitation = clamp01(state.agitation01);
    const inlet = clamp01(state.inlet01 ?? 0);
    const disturbance = clamp01(state.disturbance01 ?? 0);
    const dt = Math.max(0, Math.min(state.dtSeconds, 0.05));
    const velocityX = state.velocityX ?? 0;
    const velocityZ = state.velocityZ ?? 0;

    this.mesh.position.y = state.surfaceY;
    this.mesh.visibility = fill <= 0.001 ? 0 : 0.92;

    this.updateSloshTilt(velocityX, velocityZ, agitation, dt);
    this.mesh.rotation.x = Math.PI / 2 + this.tiltX;
    this.mesh.rotation.z = this.tiltZ;

    this.rippleCooldown -= dt;
    if (inlet > 0.04 && this.rippleCooldown <= 0) {
      this.addDisturbance(0, 0, 0.22 + inlet * 0.65);
      this.rippleCooldown = 0.16 - inlet * 0.07;
    }
    if (disturbance > 0.08 && this.rippleCooldown <= 0.08) {
      this.addDisturbance(
        state.disturbanceX ?? 0,
        state.disturbanceZ ?? 0,
        0.18 + disturbance * 0.7,
      );
    }

    for (const ripple of this.disturbances) ripple.age += dt;
    while (this.disturbances.length > 0 && this.disturbances[0]!.age > 2.6) {
      this.disturbances.shift();
    }

    const positions = [...this.basePositions];
    const baseAmplitude =
      this.waveAmplitude * (0.22 + agitation * 0.52 + inlet * 0.24);
    const time = state.timeSeconds;

    for (let i = 0; i < positions.length; i += 3) {
      const x = this.basePositions[i] ?? 0;
      const z = this.basePositions[i + 1] ?? 0;
      const radial = Math.min(
        1,
        Math.hypot(x, z) / Math.max(0.001, this.radius),
      );
      const edgeDamping = Math.max(0.2, 1 - radial * 0.62);

      let height =
        (
          Math.sin(x * 3.2 + time * 2.6) * 0.34 +
          Math.cos(z * 4.0 - time * 2.1) * 0.28 +
          Math.sin((x + z) * 2.4 + time * 1.55) * 0.18
        ) *
        baseAmplitude *
        edgeDamping;

      // Continuous inlet pulse: visible concentric waves spreading from center.
      if (inlet > 0.02) {
        const centerDistance = Math.hypot(x, z);
        height +=
          Math.sin(centerDistance * 9.5 - time * 8.4) *
          Math.exp(-centerDistance * 0.55) *
          this.waveAmplitude *
          inlet *
          0.78;
      }

      // Local body/jet disturbances propagate as damped rings.
      for (const ripple of this.disturbances) {
        const distance = Math.hypot(x - ripple.x, z - ripple.z);
        const ageDamping = Math.exp(-ripple.age * 1.35);
        const spatialDamping = Math.exp(-distance * 0.52);
        height +=
          Math.sin(distance * 11.5 - ripple.age * 10.5) *
          ageDamping *
          spatialDamping *
          this.waveAmplitude *
          ripple.strength;
      }

      positions[i + 2] = height;
    }

    this.mesh.updateVerticesData(VertexBuffer.PositionKind, positions);
    this.material.setFloat("time", state.timeSeconds);
    this.material.setFloat(
      "agitation",
      clamp01(agitation * 0.8 + inlet * 0.35 + disturbance * 0.3),
    );
    this.material.setVector3("cameraPosition", state.cameraPosition);
  }

  private updateSloshTilt(
    velocityX: number,
    velocityZ: number,
    agitation: number,
    dt: number,
  ): void {
    const targetX = clamp(-velocityZ * (0.024 + agitation * 0.055), -0.11, 0.11);
    const targetZ = clamp(velocityX * (0.024 + agitation * 0.055), -0.11, 0.11);

    const stiffness = 20;
    const damping = 5.2;

    this.tiltVelocityX += (targetX - this.tiltX) * stiffness * dt;
    this.tiltVelocityZ += (targetZ - this.tiltZ) * stiffness * dt;
    this.tiltVelocityX *= Math.exp(-damping * dt);
    this.tiltVelocityZ *= Math.exp(-damping * dt);
    this.tiltX += this.tiltVelocityX * dt;
    this.tiltZ += this.tiltVelocityZ * dt;
  }

  private addDisturbance(x: number, z: number, strength: number): void {
    this.disturbances.push({
      x: clamp(x, -this.radius, this.radius),
      z: clamp(z, -this.radius, this.radius),
      strength: clamp01(strength),
      age: 0,
    });

    while (this.disturbances.length > 12) this.disturbances.shift();
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
