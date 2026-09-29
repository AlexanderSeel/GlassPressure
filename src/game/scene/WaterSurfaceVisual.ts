import {
  Mesh,
  Scene,
  ShaderMaterial,
  TransformNode,
  Vector2,
  Vector3,
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

export class WaterSurfaceVisual {
  public readonly mesh: Mesh;

  private tiltX = 0;
  private tiltZ = 0;
  private tiltVelocityX = 0;
  private tiltVelocityZ = 0;

  public constructor(
    scene: Scene,
    name: string,
    radius: number,
    private readonly material: ShaderMaterial,
    parent: TransformNode | null = null,
    segments = 72,
    waveAmplitude = 0.045,
  ) {
    this.mesh = createRadialWaterMesh(
      scene,
      name,
      radius,
      Math.max(48, segments),
      18,
    );
    this.mesh.rotation.x = Math.PI / 2;
    this.mesh.material = material;
    this.mesh.isPickable = false;
    this.mesh.parent = parent;
    this.mesh.visibility = 0.9;

    this.material.setFloat("waveAmplitude", waveAmplitude);
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

    this.material.setFloat("time", state.timeSeconds);
    this.material.setFloat(
      "agitation",
      clamp01(agitation * 0.55 + inlet * 0.2 + disturbance * 0.25),
    );
    this.material.setFloat("impactStrength", clamp01(inlet * 0.7 + disturbance * 0.45));
    this.material.setVector2(
      "impactPosition",
      new Vector2(
        state.disturbanceX ?? 0,
        state.disturbanceZ ?? 0,
      ),
    );
    this.material.setVector2(
      "flowDirection",
      new Vector2(
        clamp(velocityX * 0.25, -1, 1),
        clamp(velocityZ * 0.25, -1, 1),
      ),
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
      -velocityZ * (0.008 + agitation * 0.012),
      -0.025,
      0.025,
    );
    const targetZ = clamp(
      velocityX * (0.008 + agitation * 0.012),
      -0.025,
      0.025,
    );

    const stiffness = 7.5;
    const damping = 7.2;

    this.tiltVelocityX += (targetX - this.tiltX) * stiffness * dt;
    this.tiltVelocityZ += (targetZ - this.tiltZ) * stiffness * dt;
    this.tiltVelocityX *= Math.exp(-damping * dt);
    this.tiltVelocityZ *= Math.exp(-damping * dt);
    this.tiltX += this.tiltVelocityX * dt;
    this.tiltZ += this.tiltVelocityZ * dt;
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
    indices.push(0, firstRingStart + segment, firstRingStart + next);
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
