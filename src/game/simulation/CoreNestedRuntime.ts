import {
  Mesh,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
  PBRMaterial,
  Scene,
  Vector3,
} from "@babylonjs/core";
import {
  buoyancyForceNewtons,
  submergedSphereFraction,
  submergedSphereVolume,
} from "./Buoyancy";

const RADIUS_SCENE = 0.22;
const MASS_KG = 0.032;
const SCENE_TO_METERS = 0.1;

export class CoreNestedRuntime {
  public readonly mesh: Mesh;
  public readonly body: PhysicsAggregate;

  private enabledState = false;
  private initialPosition = new Vector3(0.58, 2.32, 0.05);

  public constructor(
    scene: Scene,
    glassMaterial: PBRMaterial,
  ) {
    this.mesh = MeshBuilder.CreateSphere(
      "core-nested-collider",
      {
        diameter: RADIUS_SCENE * 2,
        segments: 16,
      },
      scene,
    );
    this.mesh.visibility = 0;
    this.mesh.isPickable = false;

    const bulb = MeshBuilder.CreateSphere(
      "core-nested-bulb",
      {
        diameter: 0.39,
        segments: 28,
      },
      scene,
    );
    bulb.parent = this.mesh;
    bulb.scaling.copyFromFloats(0.88, 0.8, 0.88);
    bulb.position.y = -0.025;
    bulb.material = glassMaterial;
    bulb.isPickable = false;

    const neck = MeshBuilder.CreateCylinder(
      "core-nested-neck",
      {
        diameterTop: 0.18,
        diameterBottom: 0.24,
        height: 0.23,
        tessellation: 24,
      },
      scene,
    );
    neck.parent = this.mesh;
    neck.position.y = 0.185;
    neck.material = glassMaterial;
    neck.isPickable = false;

    const rim = MeshBuilder.CreateTorus(
      "core-nested-rim",
      {
        diameter: 0.19,
        thickness: 0.026,
        tessellation: 24,
      },
      scene,
    );
    rim.parent = this.mesh;
    rim.position.y = 0.31;
    rim.material = glassMaterial;
    rim.isPickable = false;

    this.body = new PhysicsAggregate(
      this.mesh,
      PhysicsShapeType.SPHERE,
      {
        mass: MASS_KG,
        restitution: 0.06,
        friction: 0.38,
      },
      scene,
    );

    this.configure(false);
  }

  public configure(
    enabled: boolean,
    position = this.initialPosition,
  ): void {
    this.enabledState = enabled;
    this.initialPosition = position.clone();

    this.body.body.setLinearVelocity(Vector3.Zero());
    this.body.body.setAngularVelocity(Vector3.Zero());

    if (!enabled) {
      this.mesh.setEnabled(false);
      this.mesh.position.copyFromFloats(0, -30, 0);
      return;
    }

    this.mesh.setEnabled(true);
    this.mesh.position.copyFrom(position);
  }

  public applyHydrodynamics(waterSurfaceY: number): void {
    if (!this.enabledState) return;

    const position = this.mesh.getAbsolutePosition();
    const radiusMeters = RADIUS_SCENE * SCENE_TO_METERS;
    const sphereBottomY = position.y - RADIUS_SCENE;
    const immersionMeters =
      Math.max(0, waterSurfaceY - sphereBottomY) *
      SCENE_TO_METERS;
    const displacedM3 = submergedSphereVolume(
      radiusMeters,
      immersionMeters,
    );
    const buoyancyN = buoyancyForceNewtons(
      1000,
      displacedM3,
    );
    const immersion01 = submergedSphereFraction(
      radiusMeters,
      immersionMeters,
    );

    const velocity = this.body.body.getLinearVelocity();
    const dragScale = 0.08 + immersion01 * 0.92;
    const drag = new Vector3(
      -velocity.x * 0.12 * dragScale,
      -velocity.y * 0.22 * dragScale,
      -velocity.z * 0.12 * dragScale,
    );

    this.body.body.applyForce(
      new Vector3(0, Math.min(1.1, buoyancyN), 0).add(drag),
      position,
    );
  }

  public applyCurrentForce(force: Vector3): void {
    if (!this.enabledState) return;
    this.body.body.applyForce(
      force,
      this.mesh.getAbsolutePosition(),
    );
  }

  public reset(): void {
    this.configure(
      this.enabledState,
      this.initialPosition,
    );
  }

  public get enabled(): boolean {
    return this.enabledState;
  }

  public get position(): Vector3 {
    return this.mesh.getAbsolutePosition();
  }

  public get linearVelocity(): Vector3 {
    return this.body.body.getLinearVelocity();
  }

  public get radiusScene(): number {
    return RADIUS_SCENE;
  }
}
