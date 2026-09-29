import HavokPhysics from "@babylonjs/havok";
import {
  ArcRotateCamera,
  Color3,
  Engine,
  HavokPlugin,
  Mesh,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
  PBRMaterial,
  Scene,
  TransformNode,
  Vector3,
} from "@babylonjs/core";
import { LEVELS, type LevelDefinition } from "./level/LevelDefinition";
import { LevelRuntime } from "./level/LevelRuntime";
import { effectiveTargetPressurePa, targetProgressMultiplier } from "./level/TargetStrategy";
import { buoyancyForceNewtons, submergedSphereVolume } from "./simulation/Buoyancy";
import { FixedStepRunner } from "./simulation/FixedStepRunner";
import { FluidSystem, type FluidCompartment } from "./simulation/FluidSystem";
import { NestedVesselRuntime } from "./simulation/NestedVesselRuntime";
import {
  receiverSurfaceWorldY,
  receiverWaterHeightScene,
  sourceSurfaceLocalY,
  sourceWaterHeightScene,
} from "./simulation/WaterLevels";
import { drillingEfficiency, stepGlassStress } from "./simulation/GlassStress";
import { createGlassMaterial, createWaterMaterial, createWaterSurfaceMaterial } from "./scene/materials";
import { WaterSurfaceVisual } from "./scene/WaterSurfaceVisual";
import { createEnvironmentScene } from "./scene/EnvironmentScene";
import { createBasinCollision } from "./scene/BasinCollision";
import { createOpenCupCollision, type CupCollision } from "./scene/CupCollision";
import { FlowVisuals } from "./scene/FlowVisuals";
import { GlassBreakVisuals } from "./scene/GlassBreakVisuals";
import { TargetLeakVisual } from "./scene/TargetLeakVisual";
import { DrillTargetRuntime } from "./targets/DrillTargetRuntime";
import { DrillController } from "./tools/DrillController";
import { HudController } from "./ui/HudController";
import { resolveQualityPreset } from "./quality/QualitySettings";
import { readQualityPreference, SettingsController } from "./ui/SettingsController";

const DIAMETERS = [0.006, 0.01, 0.016] as const;
const RECEIVER_BASE_Y = 0.2;
const INNER_RADIUS_SCENE = 0.575;
const SCENE_TO_METERS = 0.1;
const INNER_RADIUS_METERS = INNER_RADIUS_SCENE * SCENE_TO_METERS;

export class Game {
  private readonly engine: Engine;
  private readonly scene: Scene;
  private readonly runtime = new LevelRuntime(LEVELS);
  private readonly targetHostBasePosition = new Vector3(0, 2.9, 0);
  private readonly fluid = new FluidSystem();
  private readonly fixedStep = new FixedStepRunner(1 / 60, 5);
  private readonly drill = new DrillController();
  private readonly hud = new HudController();
  private readonly qualityPreference = readQualityPreference();
  private readonly quality = resolveQualityPreset(
    this.qualityPreference,
    navigator.hardwareConcurrency,
    navigator.maxTouchPoints,
    window.devicePixelRatio,
  );

  private camera!: ArcRotateCamera;
  private vessel!: FluidCompartment;
  private upperWaterMesh!: Mesh;
  private receiverWaterMesh!: Mesh;
  private upperWaterSurface!: WaterSurfaceVisual;
  private receiverWaterSurface!: WaterSurfaceVisual;
  private dynamicBody!: PhysicsAggregate;
  private targetHost!: Mesh;
  private sourceRing!: Mesh;
  private drillRoot!: TransformNode;
  private overflowVisuals!: FlowVisuals;
  private breakVisuals!: GlassBreakVisuals;
  private nestedVessel!: NestedVesselRuntime;
  private waterMaterial!: PBRMaterial;
  private readonly leakVisuals = new Map<string, TargetLeakVisual>();
  private sourceCupCollision: CupCollision | null = null;

  private readonly targets: DrillTargetRuntime[] = [];
  private activeTarget: DrillTargetRuntime | null = null;

  private receiverVolumeM3 = this.runtime.level.initialReceiverVolumeM3;
  private diameterIndex = 1;
  private targetLocked = false;
  private lastPressurePa = 0;
  private lastOutflowM3 = 0;
  private lastNestedOutflowM3 = 0;
  private pointerMotion = 0;
  private failed = false;

  public constructor(private readonly canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: false,
      stencil: true,
      adaptToDeviceRatio: true,
    });
    this.engine.setHardwareScalingLevel(this.quality.hardwareScalingLevel);
    this.scene = new Scene(this.engine);
  }

  public async start(): Promise<void> {
    await this.configurePhysics();
    this.createEnvironment();
    this.createPuzzle();
    this.createDrill();
    this.bindInput();
    new SettingsController(this.qualityPreference);

    this.engine.runRenderLoop(() => {
      const frameSeconds = this.engine.getDeltaTime() / 1000;
      this.fixedStep.advance(frameSeconds, dt => this.simulate(dt));
      this.updateToolVisual();
      this.updateHud();
      this.scene.render();
    });

    window.addEventListener("resize", () => this.engine.resize());
  }

  private async configurePhysics(): Promise<void> {
    const havok = await HavokPhysics();
    this.scene.enablePhysics(new Vector3(0, -9.81, 0), new HavokPlugin(true, havok));
  }

  private createEnvironment(): void {
    this.camera = createEnvironmentScene(
      this.scene,
      this.canvas,
      this.quality,
    );
  }

  private createPuzzle(): void {
    const glass = createGlassMaterial(
      "vessel-glass",
      this.scene,
      this.quality.glassRefractionIntensity,
    );
    const water = createWaterMaterial("water", this.scene);
    this.waterMaterial = water;
    const upperSurfaceMaterial = createWaterSurfaceMaterial(
      "upper-water-surface-material",
      this.scene,
    );
    const receiverSurfaceMaterial = createWaterSurfaceMaterial(
      "receiver-water-surface-material",
      this.scene,
    );

    const outer = MeshBuilder.CreateCylinder(
      "outer-vessel",
      { diameter: 5.5, height: 5.35, tessellation: 72 },
      this.scene,
    );
    outer.position.y = 2.78;
    outer.material = glass;
    outer.isPickable = false;

    const upper = MeshBuilder.CreateCylinder(
      "upper-vessel",
      { diameter: 3.8, height: 1.8, tessellation: 64 },
      this.scene,
    );
    upper.position.copyFrom(this.targetHostBasePosition);
    upper.material = glass;
    upper.isPickable = false;
    this.targetHost = upper;

    const parentRim = MeshBuilder.CreateTorus(
      "parent-cup-rim",
      {
        diameter: 3.8,
        thickness: 0.075,
        tessellation: 64,
      },
      this.scene,
    );
    parentRim.parent = upper;
    parentRim.position.y = 0.9;
    parentRim.material = glass;
    parentRim.isPickable = false;

    this.sourceRing = MeshBuilder.CreateTorus(
      "source-rotating-ring",
      {
        diameter: 4.05,
        thickness: 0.16,
        tessellation: 64,
      },
      this.scene,
    );
    this.sourceRing.parent = upper;
    this.sourceRing.material = glass;
    this.sourceRing.isPickable = false;
    this.configureSourceRing();

    this.upperWaterMesh = MeshBuilder.CreateCylinder(
      "upper-water",
      {
        diameter: 3.35,
        height: 1,
        tessellation: 64,
        cap: Mesh.NO_CAP,
      },
      this.scene,
    );
    this.upperWaterMesh.parent = upper;
    this.upperWaterMesh.position.y = -0.25;
    this.upperWaterMesh.material = water;
    this.upperWaterMesh.isPickable = false;
    this.upperWaterMesh.visibility = 0.24;

    this.upperWaterSurface = new WaterSurfaceVisual(
      this.scene,
      "upper-water-surface",
      1.82,
      upperSurfaceMaterial,
      upper,
      64,
      0.035,
    );

    this.receiverWaterMesh = MeshBuilder.CreateCylinder(
      "receiver-water",
      {
        diameter: 5.1,
        height: 1,
        tessellation: 72,
        cap: Mesh.NO_CAP,
      },
      this.scene,
    );
    this.receiverWaterMesh.material = water;
    this.receiverWaterMesh.isPickable = false;
    this.receiverWaterMesh.visibility = 0.22;

    this.receiverWaterSurface = new WaterSurfaceVisual(
      this.scene,
      "receiver-water-surface",
      2.5,
      receiverSurfaceMaterial,
      null,
      72,
      0.055,
    );

    const inner = MeshBuilder.CreateSphere(
      "inner-vessel-collider",
      { diameter: INNER_RADIUS_SCENE * 2, segments: 24 },
      this.scene,
    );
    inner.position = new Vector3(
      ...(this.level.primaryBodyInitialPosition ?? [0.45, 1.75, 0]),
    );
    inner.visibility = 0;
    inner.isPickable = false;

    const innerCup = MeshBuilder.CreateCylinder(
      "inner-glass-cup",
      {
        diameterTop: 1.34,
        diameterBottom: 0.98,
        height: 1.08,
        tessellation: 48,
      },
      this.scene,
    );
    innerCup.parent = inner;
    innerCup.material = glass;
    innerCup.isPickable = false;

    const innerCupRim = MeshBuilder.CreateTorus(
      "inner-glass-cup-rim",
      {
        diameter: 1.34,
        thickness: 0.065,
        tessellation: 48,
      },
      this.scene,
    );
    innerCupRim.parent = inner;
    innerCupRim.position.y = 0.55;
    innerCupRim.material = glass;
    innerCupRim.isPickable = false;

    this.dynamicBody = new PhysicsAggregate(
      inner,
      PhysicsShapeType.SPHERE,
      { mass: 0.43, restitution: 0.08, friction: 0.45 },
      this.scene,
    );

    this.nestedVessel = new NestedVesselRuntime(
      this.scene,
      glass,
      water,
    );
    this.nestedVessel.configure(this.level.nestedVessel);

    const innerFluid = MeshBuilder.CreateCylinder(
      "inner-fluid",
      {
        diameterTop: 0.96,
        diameterBottom: 0.7,
        height: 0.62,
        tessellation: 32,
      },
      this.scene,
    );
    innerFluid.parent = inner;
    innerFluid.position.y = -0.17;
    const innerWater = new PBRMaterial("inner-water-material", this.scene);
    innerWater.albedoColor = new Color3(0.03, 0.55, 0.34);
    innerWater.emissiveColor = new Color3(0.01, 0.08, 0.04);
    innerWater.alpha = 0.72;
    innerFluid.material = innerWater;

    createBasinCollision(this.scene, RECEIVER_BASE_Y);
    this.configureSourceCupCollision();

    for (const targetDefinition of this.level.targets) {
      this.targets.push(
        new DrillTargetRuntime(
          this.scene,
          this.targetHostFor(targetDefinition.host),
          targetDefinition,
        ),
      );
    }

    this.buildLeakVisuals();
    this.overflowVisuals = new FlowVisuals(
      this.scene,
      Math.max(8, Math.floor(this.quality.flowParticlePoolSize * 0.7)),
    );
    this.breakVisuals = new GlassBreakVisuals(
      this.scene,
      this.quality.glassFragmentBudget,
    );

    const inlet = MeshBuilder.CreateCylinder(
      "inlet-stream",
      { diameter: 0.18, height: 3.2, tessellation: 20 },
      this.scene,
    );
    inlet.position.y = 5.55;
    inlet.material = water;
    inlet.isPickable = false;

    this.vessel = {
      id: "upper",
      capacityM3: this.level.sourceCapacityM3,
      volumeM3: this.level.initialSourceVolumeM3,
      heightMeters: this.level.sourceHeightMeters,
      densityKgM3: 1000,
      inletM3PerSecond: this.level.sourceInletM3PerSecond,
      holes: [],
    };

    this.updateWaterVisuals();
  }

  private createDrill(): void {
    this.drillRoot = new TransformNode("drill-root", this.scene);

    const body = MeshBuilder.CreateCylinder(
      "drill-body",
      { diameter: 0.28, height: 0.72, tessellation: 24 },
      this.scene,
    );
    body.parent = this.drillRoot;
    body.rotation.x = Math.PI / 2;
    body.position.z = -0.34;

    const bodyMat = new PBRMaterial("drill-body-material", this.scene);
    bodyMat.albedoColor = new Color3(0.08, 0.11, 0.13);
    bodyMat.metallic = 0.72;
    bodyMat.roughness = 0.3;
    body.material = bodyMat;

    const collar = MeshBuilder.CreateCylinder(
      "drill-collar",
      { diameter: 0.33, height: 0.13, tessellation: 24 },
      this.scene,
    );
    collar.parent = this.drillRoot;
    collar.rotation.x = Math.PI / 2;
    collar.position.z = 0.03;

    const collarMat = new PBRMaterial("drill-collar-material", this.scene);
    collarMat.albedoColor = new Color3(0.11, 0.45, 0.62);
    collarMat.emissiveColor = new Color3(0.01, 0.12, 0.2);
    collarMat.metallic = 0.4;
    collarMat.roughness = 0.22;
    collar.material = collarMat;

    const bit = MeshBuilder.CreateCylinder(
      "drill-bit",
      { diameter: 0.035, height: 0.62, tessellation: 12 },
      this.scene,
    );
    bit.parent = this.drillRoot;
    bit.rotation.x = Math.PI / 2;
    bit.position.z = 0.39;

    const bitMat = new PBRMaterial("drill-bit-material", this.scene);
    bitMat.albedoColor = new Color3(0.48, 0.5, 0.52);
    bitMat.metallic = 0.95;
    bitMat.roughness = 0.18;
    bit.material = bitMat;

    body.isPickable = false;
    collar.isPickable = false;
    bit.isPickable = false;
  }

  private bindInput(): void {
    this.canvas.addEventListener("pointerdown", event => {
      if (event.button !== 0 || this.failed || this.runtime.phase !== "playing") return;

      const pick = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
      const target = this.targets.find(runtime =>
        runtime.ownsPickedMesh(pick?.pickedMesh as Mesh | null | undefined),
      );
      if (!target || target.holeCreated || !target.isHeightAccessible) return;

      this.activeTarget = target;
      this.targetLocked = true;
      this.drill.press();
    });

    window.addEventListener("pointermove", event => {
      this.pointerMotion = Math.min(
        600,
        this.pointerMotion + Math.hypot(event.movementX, event.movementY) * 7,
      );

      const pick = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
      const hovered = this.targets.find(runtime =>
        runtime.ownsPickedMesh(pick?.pickedMesh as Mesh | null | undefined),
      );
      for (const target of this.targets) {
        target.setHovered(target === hovered);
      }
      this.canvas.style.cursor = hovered ? "crosshair" : "grab";
    });

    window.addEventListener("pointerup", () => {
      this.targetLocked = false;
      this.drill.release();
    });

    window.addEventListener("keydown", event => {
      if (event.key === "1") this.diameterIndex = 0;
      if (event.key === "2") this.diameterIndex = 1;
      if (event.key === "3") this.diameterIndex = 2;
      if (event.key.toLowerCase() === "r") this.resetLevel();
      if (event.key.toLowerCase() === "n") this.nextLevel();
      if (import.meta.env.DEV && event.key.toLowerCase() === "t") {
        this.advanceDevCheckpoint();
      }
    });
  }

  private simulate(dt: number): void {
    this.updateHostMotion(dt);

    const alignment = this.activeTarget ? this.targetAlignment01(this.activeTarget) : 0;
    const targetAvailable =
      this.activeTarget !== null &&
      !this.activeTarget.holeCreated &&
      this.activeTarget.isHeightAccessible &&
      !this.failed;

    this.drill.step(dt, this.targetLocked && targetAvailable);

    const result = this.fluid.step(this.vessel, dt);
    const nestedOutflowM3 = this.nestedVessel.stepFluid(dt);
    this.lastPressurePa = result.pressurePa;
    this.lastNestedOutflowM3 = nestedOutflowM3;
    const transferredM3 =
      result.outflowM3 + result.overflowM3 + nestedOutflowM3;
    this.lastOutflowM3 = transferredM3;
    this.receiverVolumeM3 = Math.min(
      this.level.receiverCapacityM3,
      this.receiverVolumeM3 + transferredM3,
    );

    this.pointerMotion *= Math.exp(-dt * 7.5);

    if (this.activeTarget && !this.activeTarget.holeCreated) {
      const activePressurePa =
        this.activeTarget.definition.effect === "nested-drain"
          ? this.nestedVessel.pressurePa
          : result.pressurePa;
      this.simulateActiveTarget(this.activeTarget, alignment, activePressurePa, dt);
    }

    this.updateTargetVisuals();
    this.applyBuoyancy();
    this.nestedVessel.applyHydrodynamics(
      this.waterSurfaceForBody(this.nestedVessel.position),
    );
    this.applyNestedWashout();
    this.applyReceiverCurrent(dt, transferredM3);
    this.updateOpenHoleFlows(result.holeOutflowsM3, dt);
    this.updateOverflowVisuals(result.overflowM3, dt);
    this.breakVisuals.update(dt);
    this.updateWaterVisuals(dt, transferredM3);

    this.runtime.evaluate({
      glassFailed: this.failed,
      holeCreated: this.hasPrimaryDrain,
      sourceFill01: this.fluid.getFillRatio(this.vessel),
      receiverFill01: this.receiverFill,
      innerHeightScene: this.dynamicBody.transformNode.getAbsolutePosition().y,
      innerXScene: this.dynamicBody.transformNode.getAbsolutePosition().x,
      secondaryHoleCreated: this.hasNestedDrain,
      secondaryHeightScene: this.nestedVessel.heightScene,
      secondaryEscaped: this.nestedVesselEscaped,
    });
  }

  private simulateActiveTarget(
    target: DrillTargetRuntime,
    alignment: number,
    pressurePa: number,
    dt: number,
  ): void {
    const steadiness = this.drillSteadiness01;
    const stress = stepGlassStress(
      target.stress01,
      {
        drilling: this.drill.isDrilling,
        alignment01: alignment,
        steadiness01: steadiness,
        diameterMeters: this.selectedDiameter,
        localPressurePa: effectiveTargetPressurePa(
          pressurePa,
          target.definition.effect,
          this.pressureReliefOpen,
        ),
        wallThicknessMeters: target.definition.wallThicknessMeters,
        nearbyDamage01: Math.max(0, target.stress01 - 0.55),
      },
      dt,
    );

    target.stress01 = Math.min(
      1,
      Math.max(
        0,
        target.stress01 +
          (stress.stress01 - target.stress01) * target.definition.stressMultiplier,
      ),
    );

    if (this.drill.isDrilling) {
      const forgivingAlignment = Math.max(0.42, alignment);
      const efficiency = drillingEfficiency(forgivingAlignment, steadiness);
      target.progress01 +=
        dt *
        0.42 *
        efficiency *
        targetProgressMultiplier(target.definition.effect, this.pressureReliefOpen);

      if (target.progress01 >= 1) {
        const diameter = this.selectedDiameter * target.definition.holeDiameterScale;
        if (target.definition.effect === "nested-drain") {
          target.fluidHoleIndex = this.nestedVessel.addDrain(
            diameter,
            target.definition.holeElevationMeters,
          );
        } else {
          target.fluidHoleIndex = this.vessel.holes.length;
          this.fluid.addHole(
            this.vessel,
            diameter,
            target.definition.holeElevationMeters,
          );
        }
        target.holeCreated = true;
        this.targetLocked = false;
        this.activeTarget = null;
        this.drill.notifyBreakthrough();
        target.marker.scaling.setAll(0.55);
      }
    }

    if (target.stress01 >= 1 && !this.failed) {
      this.failGlass(target);
    }
  }

  private applyBuoyancy(): void {
    const bodyPosition = this.dynamicBody.transformNode.getAbsolutePosition();
    const sphereBottomY = bodyPosition.y - INNER_RADIUS_SCENE;
    const waterSurfaceY = this.waterSurfaceForBody(bodyPosition);
    const immersionScene = Math.max(0, waterSurfaceY - sphereBottomY);
    const immersionMeters = immersionScene * SCENE_TO_METERS;

    const submergedVolume = submergedSphereVolume(INNER_RADIUS_METERS, immersionMeters);
    const buoyancy = buoyancyForceNewtons(1000, submergedVolume);

    const velocity = this.dynamicBody.body.getLinearVelocity();
    const drag = new Vector3(
      -velocity.x * 0.32,
      -velocity.y * 0.58,
      -velocity.z * 0.32,
    );

    const upward = new Vector3(0, Math.min(8, buoyancy), 0);
    this.dynamicBody.body.applyForce(upward.add(drag), bodyPosition);
  }

  private applyNestedWashout(): void {
    if (
      !this.level.nestedAssembly ||
      !this.hasNestedDrain ||
      this.nestedVesselEscaped
    ) {
      return;
    }

    const host = this.targetHost.getAbsolutePosition();
    const position = this.nestedVessel.position;
    const outward = position.subtract(host);
    outward.y = 0;
    if (outward.lengthSquared() < 0.04) {
      outward.copyFromFloats(1, 0, 0);
    } else {
      outward.normalize();
    }

    const fill = this.fluid.getFillRatio(this.vessel);
    const strength = 0.12 + fill * 0.24;
    this.nestedVessel.applyCurrentForce(
      outward.scale(strength).add(new Vector3(0, 0.08 + fill * 0.08, 0)),
    );
  }

  private advanceDevCheckpoint(): void {
    if (this.runtime.levelNumber !== 1) return;

    const position = this.nestedVessel.position;
    if (this.fluid.getFillRatio(this.vessel) < 0.9) {
      this.vessel.volumeM3 = this.vessel.capacityM3 * 0.92;
      this.receiverVolumeM3 = Math.max(
        this.receiverVolumeM3,
        this.level.receiverCapacityM3 * 0.04,
      );
      return;
    }

    if (position.y < 3.1) {
      this.nestedVessel.setPosition(new Vector3(-0.45, 3.12, -0.05));
      return;
    }

    this.nestedVessel.setPosition(new Vector3(1.25, 3.58, 0));
  }

  private applyReceiverCurrent(dt: number, transferredM3: number): void {
    if (transferredM3 <= 0) return;

    const time = this.runtime.elapsedSeconds;
    const transferRate = transferredM3 / Math.max(dt, 1 / 120);
    const strength = Math.min(0.42, transferRate * 850);
    const current = new Vector3(
      Math.sin(time * 1.37) * strength,
      0,
      Math.cos(time * 1.11 + 0.6) * strength,
    );

    const primaryPosition =
      this.dynamicBody.transformNode.getAbsolutePosition();
    this.dynamicBody.body.applyForce(current, primaryPosition);

    if (this.nestedVessel.enabled) {
      this.nestedVessel.applyCurrentForce(current.scale(-0.72));
    }
  }

  private updateOpenHoleFlows(
    sourceHoleOutflowsM3: readonly number[],
    dt: number,
  ): void {
    for (const target of this.targets) {
      const visual = this.leakVisuals.get(target.definition.id);
      if (!visual) continue;

      if (!target.holeCreated || target.fluidHoleIndex === null) {
        visual.hide(dt);
        continue;
      }

      const outflowM3 =
        target.definition.effect === "nested-drain"
          ? this.nestedVessel.holeOutflowM3(target.fluidHoleIndex)
          : sourceHoleOutflowsM3[target.fluidHoleIndex] ?? 0;

      if (outflowM3 <= 0) {
        visual.hide(dt);
        continue;
      }

      const origin = target.marker.getAbsolutePosition();
      const direction = target.outletNormal();
      visual.update(
        dt,
        outflowM3,
        origin,
        direction,
        this.waterSurfaceForBody(origin),
      );

      if (target.definition.effect === "nested-drain") {
        this.nestedVessel.applyJetReaction(direction, outflowM3);
      }
    }
  }

  private buildLeakVisuals(): void {
    for (const visual of this.leakVisuals.values()) visual.dispose();
    this.leakVisuals.clear();

    const perTargetBudget = Math.max(
      5,
      Math.floor(
        this.quality.flowParticlePoolSize /
          Math.max(1, this.level.targets.length),
      ),
    );

    for (const target of this.targets) {
      this.leakVisuals.set(
        target.definition.id,
        new TargetLeakVisual(
          this.scene,
          this.waterMaterial,
          perTargetBudget,
        ),
      );
    }
  }

  private updateOverflowVisuals(
    overflowM3: number,
    dt: number,
  ): void {
    if (overflowM3 <= 0) {
      this.overflowVisuals.update(dt, 0, null, null);
      return;
    }

    const host = this.targetHost.getAbsolutePosition();
    const phase = Math.floor(this.runtime.elapsedSeconds * 9) % 4;
    const angles = [0.25, Math.PI * 0.5 + 0.35, Math.PI + 0.15, Math.PI * 1.5 - 0.25];
    const angle = angles[phase] ?? 0;
    const rimRadius = 1.82;

    const origin = new Vector3(
      host.x + Math.sin(angle) * rimRadius,
      host.y + 0.84,
      host.z + Math.cos(angle) * rimRadius,
    );
    const direction = new Vector3(
      Math.sin(angle) * 0.42,
      -1,
      Math.cos(angle) * 0.42,
    ).normalize();

    this.overflowVisuals.update(
      dt,
      Math.max(overflowM3, 0.0000004),
      origin,
      direction,
    );
  }

  private updateWaterVisuals(
    dt = 1 / 60,
    transferredM3 = 0,
  ): void {
    const upperFill = this.fluid.getFillRatio(this.vessel);
    const upperHeight = sourceWaterHeightScene(upperFill);
    this.upperWaterMesh.scaling.y = upperHeight;
    this.upperWaterMesh.position.y =
      sourceSurfaceLocalY(upperFill) - upperHeight * 0.5;

    const lowerHeight = receiverWaterHeightScene(this.receiverFill);
    this.receiverWaterMesh.scaling.y = lowerHeight;
    this.receiverWaterMesh.position.y = RECEIVER_BASE_Y + lowerHeight * 0.5;

    const bodyPosition = this.dynamicBody.transformNode.getAbsolutePosition();
    const bodyVelocity = this.dynamicBody.body.getLinearVelocity();
    const nestedPosition = this.nestedVessel.position;
    const nestedVelocity = this.nestedVessel.linearVelocity;
    const transferRate = transferredM3 / Math.max(dt, 1 / 120);
    const transferAgitation = Math.min(1, transferRate * 2600);
    const bodyAgitation = Math.min(
      1,
      bodyVelocity.length() * 0.45 + nestedVelocity.length() * 0.32,
    );

    const hostPosition = this.targetHost.getAbsolutePosition();
    const primaryInsideSource =
      this.waterSurfaceForBody(bodyPosition) === this.sourceWaterSurfaceY;
    const nestedInsideSource =
      this.nestedVessel.enabled &&
      this.waterSurfaceForBody(nestedPosition) === this.sourceWaterSurfaceY;

    const sourceDisturbancePosition = nestedInsideSource
      ? nestedPosition
      : bodyPosition;
    const sourceDisturbanceVelocity = nestedInsideSource
      ? nestedVelocity
      : bodyVelocity;

    this.upperWaterSurface.update({
      surfaceY: sourceSurfaceLocalY(upperFill),
      fill01: upperFill,
      agitation01: Math.min(
        1,
        0.18 + this.vessel.inletM3PerSecond * 2100 + this.lastOutflowM3 * 2400,
      ),
      velocityX: primaryInsideSource ? bodyVelocity.x : 0,
      velocityZ: primaryInsideSource ? bodyVelocity.z : 0,
      inlet01: Math.min(1, this.vessel.inletM3PerSecond * 3600),
      disturbanceX: sourceDisturbancePosition.x - hostPosition.x,
      disturbanceZ: sourceDisturbancePosition.z - hostPosition.z,
      disturbance01:
        primaryInsideSource || nestedInsideSource
          ? Math.min(1, sourceDisturbanceVelocity.length() * 0.75)
          : 0,
      cameraPosition: this.camera.position,
      timeSeconds: this.runtime.elapsedSeconds,
      dtSeconds: dt,
    });

    const receiverBodyPosition = primaryInsideSource
      ? nestedPosition
      : bodyPosition;
    const receiverBodyVelocity = primaryInsideSource
      ? nestedVelocity
      : bodyVelocity;

    this.receiverWaterSurface.update({
      surfaceY: RECEIVER_BASE_Y + lowerHeight,
      fill01: this.receiverFill,
      agitation01: Math.min(
        1,
        transferAgitation * 0.85 + bodyAgitation * 0.5,
      ),
      velocityX: receiverBodyVelocity.x,
      velocityZ: receiverBodyVelocity.z,
      inlet01: Math.min(1, transferAgitation),
      disturbanceX: receiverBodyPosition.x,
      disturbanceZ: receiverBodyPosition.z,
      disturbance01: Math.min(
        1,
        receiverBodyVelocity.length() * 0.65 + transferAgitation * 0.55,
      ),
      cameraPosition: this.camera.position,
      timeSeconds: this.runtime.elapsedSeconds,
      dtSeconds: dt,
    });
  }

  private nextLevel(): void {
    this.runtime.next();
    this.rebuildTargets();
    this.resetLevel();
  }

  private rebuildTargets(): void {
    for (const target of this.targets) target.dispose();
    this.targets.length = 0;
    for (const definition of this.level.targets) {
      this.targets.push(
        new DrillTargetRuntime(
          this.scene,
          this.targetHostFor(definition.host),
          definition,
        ),
      );
    }
    this.buildLeakVisuals();
  }

  private updateHostMotion(dt: number): void {
    const offset = this.runtime.advance(dt);
    this.targetHost.position.copyFromFloats(
      this.targetHostBasePosition.x + offset.x,
      this.targetHostBasePosition.y + offset.y,
      this.targetHostBasePosition.z,
    );
    this.targetHost.rotation.y = offset.rotationY;
  }

  private resetLevel(): void {
    this.fixedStep.reset();
    this.drill.reset();
    this.vessel.capacityM3 = this.level.sourceCapacityM3;
    this.vessel.volumeM3 = this.level.initialSourceVolumeM3;
    this.vessel.heightMeters = this.level.sourceHeightMeters;
    this.vessel.inletM3PerSecond = this.level.sourceInletM3PerSecond;
    this.vessel.holes.length = 0;
    this.receiverVolumeM3 = this.level.initialReceiverVolumeM3;
    this.nestedVessel.configure(this.level.nestedVessel);
    this.diameterIndex = 1;
    this.targetLocked = false;
    this.activeTarget = null;
    this.failed = false;
    this.runtime.reset();
    this.lastPressurePa = 0;
    this.lastOutflowM3 = 0;
    this.lastNestedOutflowM3 = 0;
    this.pointerMotion = 0;
    this.targetHost.position.copyFrom(this.targetHostBasePosition);
    this.targetHost.rotation.copyFromFloats(0, 0, 0);
    this.configureSourceRing();
    this.configureSourceCupCollision();

    for (const target of this.targets) {
      target.reset();
    }

    for (const visual of this.leakVisuals.values()) visual.reset();
    this.overflowVisuals.reset();
    this.breakVisuals.clear();

    this.dynamicBody.transformNode.position.copyFromFloats(
      ...(this.level.primaryBodyInitialPosition ?? [0.45, 1.75, 0]),
    );
    this.dynamicBody.body.setLinearVelocity(Vector3.Zero());
    this.dynamicBody.body.setAngularVelocity(Vector3.Zero());

    this.updateWaterVisuals();
  }

  private configureSourceCupCollision(): void {
    if (this.sourceCupCollision) {
      for (const aggregate of this.sourceCupCollision.aggregates) aggregate.dispose();
      for (const mesh of this.sourceCupCollision.meshes) mesh.dispose();
      this.sourceCupCollision = null;
    }

    if (!this.level.nestedAssembly) return;

    this.sourceCupCollision = createOpenCupCollision(
      this.scene,
      "parent-cup",
      this.targetHostBasePosition,
      1.74,
      1.76,
      16,
    );
  }

  private configureSourceRing(): void {
    const ring = this.level.sourceRing;
    if (!ring) {
      this.sourceRing.visibility = 0;
      return;
    }

    this.sourceRing.visibility = 0.72;
    this.sourceRing.position.copyFromFloats(0, ring.localY, 0);
    this.sourceRing.rotation.copyFromFloats(ring.tiltRadians, 0, 0);
    const diameterScale = ring.diameterScene / 4.05;
    const thicknessScale = ring.thicknessScene / 0.16;
    this.sourceRing.scaling.copyFromFloats(
      diameterScale,
      thicknessScale,
      diameterScale,
    );
  }

  private updateTargetVisuals(): void {
    for (const target of this.targets) {
      target.updateVisual(this.failed);
    }
  }

  private failGlass(target: DrillTargetRuntime): void {
    this.failed = true;
    this.runtime.fail();
    this.targetLocked = false;
    this.activeTarget = target;
    this.drill.release();
    target.showFailure();
    target.marker.visibility = 0.18;
    this.breakVisuals.spawn(
      target.marker.getAbsolutePosition(),
      target.surfaceNormal(this.camera.position),
    );
  }

  private updateToolVisual(): void {
    const target = this.activeTarget?.marker ?? this.targets[0]?.marker;
    if (!target) return;

    const targetPosition = target.getAbsolutePosition();
    const cameraPosition = this.camera.position;
    const toTarget = targetPosition.subtract(cameraPosition);
    const distance = Math.max(0.5, toTarget.length());
    const direction = toTarget.normalize();

    const standOff = 1.25 - this.drill.extension * 0.82;
    this.drillRoot.position = cameraPosition.add(
      direction.scale(Math.max(0.35, distance - standOff)),
    );
    this.drillRoot.lookAt(targetPosition);
  }

  private updateHud(): void {
    const bodyPosition = this.dynamicBody.transformNode.getAbsolutePosition();
    const bodyVelocity = this.dynamicBody.body.getLinearVelocity();
    const activeStress = this.activeTarget?.stress01 ?? this.maxTargetStress;
    const alignment = this.activeTarget
      ? this.targetAlignment01(this.activeTarget)
      : 0;

    this.hud.render({
      levelPhase: this.runtime.phase,
      objective: this.level.objective,
      failed: this.failed,
      pressurePa: this.lastPressurePa,
      crackRisk01: activeStress,
      diameterMeters: this.selectedDiameter,
      toolState: this.drill.state,
      alignment01: alignment,
      flowM3: this.lastOutflowM3,
      selectedTargetLabel:
        this.activeTarget?.definition.label ??
        (this.hasNestedDrain
          ? "Nested vessel released"
          : this.hasPrimaryDrain
            ? "Main drain opened"
            : "Choose target"),
      drillProgress01: this.activeTarget?.progress01 ?? 0,
      sourceFill01: this.fluid.getFillRatio(this.vessel),
      receiverFill01: this.receiverFill,
      sourceVolumeM3: this.vessel.volumeM3,
      hydraulicHeadMeters: this.hydraulicHeadMeters,
      innerHeightScene: bodyPosition.y,
      innerXScene: bodyPosition.x,
      bodySpeedScenePerSecond: bodyVelocity.length(),
      nestedEnabled: this.nestedVessel.enabled,
      nestedHeightScene: this.nestedVessel.heightScene,
      nestedFill01: this.nestedVessel.fill01,
      qualityTier: this.quality.tier,
    });
  }

  private targetHostFor(host: "source" | "nested" | undefined): Mesh {
    return host === "nested" ? this.nestedVessel.mesh : this.targetHost;
  }

  private targetAlignment01(target: DrillTargetRuntime): number {
    return target.alignment01(this.camera.position);
  }

  private targetSurfaceNormal(target: DrillTargetRuntime): Vector3 {
    return target.surfaceNormal(this.camera.position);
  }

  private get level(): LevelDefinition {
    return this.runtime.level;
  }

  private get drillSteadiness01(): number {
    return Math.min(1, Math.max(0, 1 - this.pointerMotion / 220));
  }

  private get selectedDiameter(): number {
    return DIAMETERS[this.diameterIndex] ?? 0.01;
  }

  private get receiverFill(): number {
    return Math.min(
      1,
      Math.max(0, this.receiverVolumeM3 / this.level.receiverCapacityM3),
    );
  }

  private get receiverWaterSurfaceY(): number {
    return receiverSurfaceWorldY(
      RECEIVER_BASE_Y,
      this.receiverFill,
    );
  }

  private get sourceWaterSurfaceY(): number {
    const upperFill = this.fluid.getFillRatio(this.vessel);
    return (
      this.targetHost.getAbsolutePosition().y +
      sourceSurfaceLocalY(upperFill)
    );
  }

  private waterSurfaceForBody(position: Vector3): number {
    const cup = this.sourceCupCollision;
    if (!cup) return this.receiverWaterSurfaceY;

    const host = this.targetHost.getAbsolutePosition();
    const radial = Math.hypot(position.x - host.x, position.z - host.z);
    const stillInsideCup =
      radial < cup.innerRadius - 0.08 &&
      position.y < cup.rimY + 0.62 &&
      position.y > cup.bottomY - 0.3;

    return stillInsideCup ? this.sourceWaterSurfaceY : this.receiverWaterSurfaceY;
  }

  private get nestedVesselEscaped(): boolean {
    const cup = this.sourceCupCollision;
    if (!cup || !this.nestedVessel.enabled) return false;

    const host = this.targetHost.getAbsolutePosition();
    const position = this.nestedVessel.position;
    const radial = Math.hypot(position.x - host.x, position.z - host.z);
    return radial > cup.innerRadius + 0.28 || position.y < cup.bottomY - 0.35;
  }

  private get pressureReliefOpen(): boolean {
    return this.targets.some(
      target =>
        target.definition.effect === "pressure-relief" &&
        target.holeCreated,
    );
  }

  private get hydraulicHeadMeters(): number {
    const density = Math.max(1, this.vessel.densityKgM3);
    return this.lastPressurePa / (density * 9.81);
  }

  private get hasPrimaryDrain(): boolean {
    return this.targets.some(
      target =>
        target.definition.effect === "primary-drain" &&
        target.holeCreated,
    );
  }

  private get hasNestedDrain(): boolean {
    return this.targets.some(
      target =>
        target.definition.effect === "nested-drain" &&
        target.holeCreated,
    );
  }

  private get maxTargetStress(): number {
    return this.targets.reduce(
      (max, target) => Math.max(max, target.stress01),
      0,
    );
  }
}
