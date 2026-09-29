import {
  Mesh,
  Scene,
  ShaderMaterial,
  TransformNode,
  Vector3,
  VertexBuffer,
  VertexData,
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
    segments = 72,
    waveAmplitude = 0.045,
  ) {
    this.radius = radius;
    this.waveAmplitude = waveAmplitude;

    this.mesh = createRadialWaterMesh(
      scene,
      name,
      radius,
      Math.max(48, segments),
      20,
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
    this.mesh.visibility = fill <= 0.001 ? 0 : 0.94;

    this.updateSloshTilt(velocityX, velocityZ, agitation, dt);
    this.mesh.rotation.x = Math.PI / 2 + this.tiltX;
    this.mesh.rotation.z = this.tiltZ;

    this.rippleCooldown -= dt;
    if (inlet > 0.025 && this.rippleCooldown <= 0) {
      this.addDisturbance(
        state.disturbanceX ?? 0,
        state.disturbanceZ ?? 0,
        0.3 + inlet * 0.65,
      );
      this.rippleCooldown = Math.max(0.055, 0.13 - inlet * 0.06);
    }

    if (disturbance > 0.08 && this.rippleCooldown <= 0.045) {
      this.addDisturbance(
        state.disturbanceX ?? 0,
        state.disturbanceZ ?? 0,
        0.18 + disturbance * 0.72,
      );
    }

    for (const ripple of this.disturbances) ripple.age += dt;
    while (
      this.disturbances.length > 0 &&
      this.disturbances[0]!.age > 2.8
    ) {
      this.disturbances.shift();
    }

    const positions = [...this.basePositions];
    const baseAmplitude =
      this.waveAmplitude * (0.035 + agitation * 0.08 + inlet * 0.045);
    const time = state.timeSeconds;

    for (let i = 0; i < positions.length; i += 3) {
      const x = this.basePositions[i] ?? 0;
      const z = this.basePositions[i + 1] ?? 0;
      const radial = Math.min(
        1,
        Math.hypot(x, z) / Math.max(0.001, this.radius),
      );
      const edgeDamping = Math.max(0.3, 1 - radial * 0.52);

      let height =
        (
          Math.sin(x * 2.4 + time * 0.9) * 0.22 +
          Math.cos(z * 2.7 - time * 0.72) * 0.18 +
          Math.sin((x + z) * 1.8 + time * 0.56) * 0.1
        ) *
        baseAmplitude *
        edgeDamping;

      if (inlet > 0.02) {
        const ix = state.disturbanceX ?? 0;
        const iz = state.disturbanceZ ?? 0;
        const impactDistance = Math.hypot(x - ix, z - iz);
        height +=
          Math.sin(impactDistance * 7.0 - time * 4.2) *
          Math.exp(-impactDistance * 1.0) *
          this.waveAmplitude *
          inlet *
          0.18;
      }

      for (const ripple of this.disturbances) {
        const distance = Math.hypot(x - ripple.x, z - ripple.z);
        const ageDamping = Math.exp(-ripple.age * 1.18);
        const spatialDamping = Math.exp(-distance * 0.48);
        height +=
          Math.sin(distance * 7.8 - ripple.age * 5.2) *
          ageDamping *
          spatialDamping *
          this.waveAmplitude *
          ripple.strength *
          0.16;
      }

      positions[i + 2] = height;
    }

    this.mesh.updateVerticesData(VertexBuffer.PositionKind, positions);
    this.mesh.refreshBoundingInfo();

    this.material.setFloat("time", state.timeSeconds);
    this.material.setFloat(
      "agitation",
      clamp01(agitation * 0.75 + inlet * 0.38 + disturbance * 0.32),
    );
    this.material.setVector3("cameraPosition", state.cameraPosition);
  }

  private updateSloshTilt(
    velocityX: number,
    velocityZ: number,
    agitation: number,
    dt: number,
  ): void {
    const targetX = clamp(
      -velocityZ * (0.012 + agitation * 0.018),
      -0.035,
      0.035,
    );
    const targetZ = clamp(
      velocityX * (0.012 + agitation * 0.018),
      -0.035,
      0.035,
    );

    const stiffness = 9;
    const damping = 6.5;

    this.tiltVelocityX += (targetX - this.tiltX) * stiffness * dt;
    this.tiltVelocityZ += (targetZ - this.tiltZ) * stiffness * dt;
    this.tiltVelocityX *= Math.exp(-damping * dt);
    this.tiltVelocityZ *= Math.exp(-damping * dt);
    this.tiltX += this.tiltVelocityX * dt;
    this.tiltZ += this.tiltVelocityZ * dt;
  }

  private addDisturbance(
    x: number,
    z: number,
    strength: number,
  ): void {
    this.disturbances.push({
      x: clamp(x, -this.radius, this.radius),
      z: clamp(z, -this.radius, this.radius),
      strength: clamp01(strength),
      age: 0,
    });

    while (this.disturbances.length > 16) this.disturbances.shift();
  }
}

function createRadialWaterMesh(
  scene: Scene,
  name: string,
  radius: number,
  angularSegments: number,
  radialSegments: number,
): Mesh {
  const positions: number[] = [0, 0, 0];
  const normals: number[] = [0, 0, 1];
  const indices: number[] = [];

  for (let ring = 1; ring <= radialSegments; ring += 1) {
    const r = radius * (ring / radialSegments);
    for (let segment = 0; segment < angularSegments; segment += 1) {
      const angle = (segment / angularSegments) * Math.PI * 2;
      positions.push(
        Math.sin(angle) * r,
        Math.cos(angle) * r,
        0,
      );
      normals.push(0, 0, 1);
    }
  }

  const firstRingStart = 1;
  for (let segment = 0; segment < angularSegments; segment += 1) {
    const next = (segment + 1) % angularSegments;
    indices.push(
      0,
      firstRingStart + segment,
      firstRingStart + next,
    );
  }

  for (let ring = 1; ring < radialSegments; ring += 1) {
    const innerStart = 1 + (ring - 1) * angularSegments;
    const outerStart = 1 + ring * angularSegments;

    for (let segment = 0; segment < angularSegments; segment += 1) {
      const next = (segment + 1) % angularSegments;
      const a = innerStart + segment;
      const b = innerStart + next;
      const c = outerStart + segment;
      const d = outerStart + next;

      indices.push(a, c, b, b, c, d);
    }
  }

  const mesh = new Mesh(name, scene);
  const vertexData = new VertexData();
  vertexData.positions = positions;
  vertexData.normals = normals;
  vertexData.indices = indices;
  vertexData.applyToMesh(mesh, true);
  return mesh;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
