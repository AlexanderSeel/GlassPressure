import {
  Color3,
  Mesh,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
  PBRMaterial,
  Scene,
  Vector3,
} from "@babylonjs/core";
import type { NestedVesselDefinition } from "../level/LevelDefinition";
import {
  buoyancyForceNewtons,
  submergedSphereFraction,
  submergedSphereVolume,
} from "./Buoyancy";
import { FluidSystem, type FluidCompartment } from "./FluidSystem";

const SCENE_TO_METERS = 0.1;
const PHYSICS_RADIUS_SCENE = 0.48;
const PHYSICS_BASE_MASS_KG = 0.13;

export class NestedVesselRuntime {
  public readonly mesh: Mesh;
  public readonly body: PhysicsAggregate;

  private readonly fluid = new FluidSystem();
  private readonly visualShell: Mesh;
  private readonly rim: Mesh;
  private readonly fluidMesh: Mesh;
  private definition: NestedVesselDefinition | null = null;
  private compartment: FluidCompartment | null = null;
  private lastPressurePa = 0;
  private lastHoleOutflowsM3: number[] = [];

  public constructor(
    private readonly scene: Scene,
    glassMaterial: PBRMaterial,
    waterMaterial: PBRMaterial,
  ) {
    this.mesh = MeshBuilder.CreateSphere(
      "nested-dynamic-vessel",
      { diameter: PHYSICS_RADIUS_SCENE * 2, segments: 32 },
      scene,
    );
    this.mesh.visibility = 0;
    this.mesh.isPickable = false;

    this.visualShell = MeshBuilder.CreateCylinder(
      "nested-glass-cup",
      {
        diameterTop: 1.02,
        diameterBottom: 0.76,
        height: 0.92,
        tessellation: 48,
      },
      scene,
    );
    this.visualShell.parent = this.mesh;
    this.visualShell.position.y = 0.02;
    this.visualShell.material = glassMaterial;
    this.visualShell.isPickable = false;

    this.rim = MeshBuilder.CreateTorus(
      "nested-glass-cup-rim",
      {
        diameter: 1.02,
        thickness: 0.055,
        tessellation: 48,
      },
      scene,
    );
    this.rim.parent = this.mesh;
    this.rim.position.y = 0.48;
    this.rim.material = glassMaterial;
    this.rim.isPickable = false;

    this.body = new PhysicsAggregate(
      this.mesh,
      PhysicsShapeType.SPHERE,
      {
        mass: PHYSICS_BASE_MASS_KG,
        restitution: 0.08,
        friction: 0.42,
      },
      scene,
    );

    this.fluidMesh = MeshBuilder.CreateCylinder(
      "nested-contained-water",
      {
        diameterTop: 0.79,
        diameterBottom: 0.58,
        height: 0.62,
        tessellation: 32,
      },
      scene,
    );
    this.fluidMesh.parent = this.mesh;
    this.fluidMesh.position.y = -0.11;
    this.fluidMesh.material = waterMaterial;
    this.fluidMesh.isPickable = false;
    this.fluidMesh.visibility = 0;
  }

  public configure(definition: NestedVesselDefinition | undefined): void {
    this.definition = definition?.enabled ? definition : null;
    this.body.body.setLinearVelocity(Vector3.Zero());
    this.body.body.setAngularVelocity(Vector3.Zero());

    if (!this.definition) {
      this.compartment = null;
      this.lastPressurePa = 0;
      this.lastHoleOutflowsM3 = [];
      this.mesh.visibility = 0;
      this.visualShell.visibility = 0;
      this.rim.visibility = 0;
      this.fluidMesh.visibility = 0;
      this.mesh.position.copyFromFloats(0, -20, 0);
      return;
    }

    if (Math.abs(this.definition.radiusScene - PHYSICS_RADIUS_SCENE) > 0.001) {
      throw new Error(
        `Nested vessel radius ${this.definition.radiusScene} is not supported by the current collision proxy`,
      );
    }

    this.mesh.visibility = 0;
    this.visualShell.visibility = 1;
    this.rim.visibility = 1;
    this.mesh.position.copyFromFloats(...this.definition.initialPosition);

    this.compartment = {
      id: "nested-vessel",
      capacityM3: this.definition.fluidCapacityM3,
      volumeM3: this.definition.initialFluidVolumeM3,
      heightMeters: this.definition.fluidHeightMeters,
      densityKgM3: 1000,
      inletM3PerSecond: 0,
      holes: [],
    };
    this.updateFluidVisual();
  }

  public stepFluid(dtSeconds: number): number {
    if (!this.compartment) return 0;
    const result = this.fluid.step(this.compartment, dtSeconds);
    this.lastPressurePa = result.pressurePa;
    this.lastHoleOutflowsM3 = result.holeOutflowsM3;
    this.updateFluidVisual();
    return result.outflowM3;
  }

  public addDrain(diameterMeters: number, elevationMeters: number): number {
    if (!this.compartment) return -1;
    const index = this.compartment.holes.length;
    this.fluid.addHole(this.compartment, diameterMeters, elevationMeters);
    return index;
  }

  public applyHydrodynamics(waterSurfaceY: number): void {
    if (!this.definition || !this.compartment) return;

    const position = this.mesh.getAbsolutePosition();
    const radiusMeters = this.definition.radiusScene * SCENE_TO_METERS;
    const sphereBottomY = position.y - this.definition.radiusScene;
    const immersionMeters =
      Math.max(0, waterSurfaceY - sphereBottomY) * SCENE_TO_METERS;
    const displacedM3 = submergedSphereVolume(radiusMeters, immersionMeters);
    const buoyancyN = buoyancyForceNewtons(1000, displacedM3);
    const immersion01 = submergedSphereFraction(
      radiusMeters,
      immersionMeters,
    );

    const velocity = this.body.body.getLinearVelocity();
    const dragScale = 0.12 + immersion01 * 0.88;
    const drag = new Vector3(
      -velocity.x * 0.26 * dragScale,
      -velocity.y * 0.48 * dragScale,
      -velocity.z * 0.26 * dragScale,
    );

    const containedWaterWeightN = this.compartment.volumeM3 * 1000 * 9.81;
    const dryMassCorrectionN =
      (this.definition.baseMassKg - PHYSICS_BASE_MASS_KG) * 9.81;

    const force = new Vector3(
      0,
      Math.min(7, buoyancyN) - containedWaterWeightN - dryMassCorrectionN,
      0,
    ).add(drag);

    this.body.body.applyForce(force, position);
  }

  public applyCurrentForce(force: Vector3): void {
    if (!this.definition) return;
    this.body.body.applyForce(force, this.mesh.getAbsolutePosition());
  }

  public setPosition(position: Vector3): void {
    if (!this.definition) return;
    this.mesh.position.copyFrom(position);
    this.body.body.setLinearVelocity(Vector3.Zero());
    this.body.body.setAngularVelocity(Vector3.Zero());
  }

  public applyJetReaction(direction: Vector3, outflowM3: number): void {
    if (!this.definition || outflowM3 <= 0) return;
    const position = this.mesh.getAbsolutePosition();
    const forceMagnitude = Math.min(1.1, outflowM3 * 360000);
    this.body.body.applyForce(
      direction.scale(forceMagnitude).add(new Vector3(0, forceMagnitude * 0.05, 0)),
      position,
    );
  }

  public reset(): void {
    this.configure(this.definition ?? undefined);
  }

  public get enabled(): boolean {
    return this.definition !== null;
  }

  public get heightScene(): number {
    return this.mesh.getAbsolutePosition().y;
  }

  public get position(): Vector3 {
    return this.mesh.getAbsolutePosition();
  }

  public get pressurePa(): number {
    return this.lastPressurePa;
  }

  public holeOutflowM3(index: number | null): number {
    if (index === null || index < 0) return 0;
    return this.lastHoleOutflowsM3[index] ?? 0;
  }

  public get linearVelocity(): Vector3 {
    return this.body.body.getLinearVelocity();
  }

  public get fluidVolumeM3(): number {
    return this.compartment?.volumeM3 ?? 0;
  }

  public get fill01(): number {
    return this.compartment ? this.fluid.getFillRatio(this.compartment) : 0;
  }

  private updateFluidVisual(): void {
    if (!this.compartment || !this.definition) {
      this.fluidMesh.visibility = 0;
      return;
    }

    const fill = this.fluid.getFillRatio(this.compartment);
    this.fluidMesh.visibility = 0.68;
    this.fluidMesh.scaling.copyFromFloats(1, Math.max(0.08, fill), 1);
    this.fluidMesh.position.y = -0.12 + fill * 0.06;
  }
}
