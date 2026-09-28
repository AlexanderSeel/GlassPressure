import {
  Mesh,
  MeshBuilder,
  PBRMaterial,
  Scene,
  TransformNode,
  VertexBuffer,
} from "@babylonjs/core";

export type WaterSurfaceUpdate = {
  surfaceY: number;
  fill01: number;
  agitation01: number;
  velocityX?: number;
  velocityZ?: number;
  timeSeconds: number;
};

export class WaterSurfaceVisual {
  public readonly mesh: Mesh;

  private readonly basePositions: number[];
  private readonly radius: number;
  private readonly waveAmplitude: number;

  public constructor(
    scene: Scene,
    name: string,
    radius: number,
    material: PBRMaterial,
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
    const fill = Math.min(1, Math.max(0, state.fill01));
    const agitation = Math.min(1, Math.max(0, state.agitation01));
    const velocityX = state.velocityX ?? 0;
    const velocityZ = state.velocityZ ?? 0;

    this.mesh.position.y = state.surfaceY;
    this.mesh.visibility = fill <= 0.001 ? 0 : 0.82 + agitation * 0.16;

    const tiltScale = 0.018 + agitation * 0.035;
    this.mesh.rotation.x =
      Math.PI / 2 +
      Math.max(-0.055, Math.min(0.055, -velocityZ * tiltScale));
    this.mesh.rotation.z =
      Math.max(-0.055, Math.min(0.055, velocityX * tiltScale));

    const positions = [...this.basePositions];
    const amplitude = this.waveAmplitude * (0.18 + agitation * 0.82);
    const time = state.timeSeconds;

    for (let i = 0; i < positions.length; i += 3) {
      const x = this.basePositions[i] ?? 0;
      const y = this.basePositions[i + 1] ?? 0;
      const radial = Math.min(1, Math.hypot(x, y) / Math.max(0.001, this.radius));
      const edgeDamping = Math.max(0.12, 1 - radial * 0.72);
      const waveA = Math.sin(x * 3.4 + time * 2.7);
      const waveB = Math.cos(y * 4.1 - time * 2.15);
      const waveC = Math.sin((x + y) * 2.2 + time * 1.55);
      positions[i + 2] =
        (waveA * 0.5 + waveB * 0.32 + waveC * 0.18) *
        amplitude *
        edgeDamping;
    }

    this.mesh.updateVerticesData(VertexBuffer.PositionKind, positions);
  }
}
