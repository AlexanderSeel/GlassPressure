import HavokPhysics from "@babylonjs/havok";
import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HavokPlugin,
  HemisphericLight,
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
import { evaluateLevel, type LevelPhase } from "./level/LevelState";
import { effectiveTargetPressurePa, targetProgressMultiplier } from "./level/TargetStrategy";
import { buoyancyForceNewtons, submergedSphereVolume } from "./simulation/Buoyancy";
import { FixedStepRunner } from "./simulation/FixedStepRunner";
import { FluidSystem, type FluidCompartment } from "./simulation/FluidSystem";
import { drillingEfficiency, stepGlassStress } from "./simulation/GlassStress";
import { createGlassMaterial, createWaterMaterial } from "./scene/materials";
import { FlowVisuals } from "./scene/FlowVisuals";
import { DrillTargetRuntime } from "./targets/DrillTargetRuntime";
import { DrillController } from "./tools/DrillController";
import { HudController } from "./ui/HudController";

const DIAMETERS = [0.006, 0.01, 0.016] as const;
const RECEIVER_BASE_Y = 0.65;
const RECEIVER_WATER_HEIGHT_SCENE = 1.45;
const INNER_RADIUS_SCENE = 0.575;
const SCENE_TO_METERS = 0.1;
const INNER_RADIUS_METERS = INNER_RADIUS_SCENE * SCENE_TO_METERS;

export class Game {
  private readonly engine: Engine;
  private readonly scene: Scene;
  private levelIndex = 0;
  private level: LevelDefinition = LEVELS[0]!;
  private levelElapsedSeconds = 0;
  private readonly targetHostBasePosition = new Vector3(0, 3.65, 0);
  private readonly fluid = new FluidSystem();
  private readonly fixedStep = new FixedStepRunner(1 / 60, 5);
  private readonly drill = new DrillController();
  private readonly hud = new HudController();

  private camera!: ArcRotateCamera;
  private vessel!: FluidCompartment;
  private upperWaterMesh!: Mesh;
  private receiverWaterMesh!: Mesh;
  private jetMesh!: Mesh;
  private dynamicBody!: PhysicsAggregate;
  private targetHost!: Mesh;
  private drillRoot!: TransformNode;
  private flowVisuals!: FlowVisuals;

  private readonly targets: DrillTargetRuntime[] = [];
  private activeTarget: DrillTargetRuntime | null = null;
  private latestOpenedTarget: DrillTargetRuntime | null = null;

  private receiverVolumeM3 = this.level.initialReceiverVolumeM3;
  private diameterIndex = 1;
  private targetLocked = false;
  private lastPressurePa = 0;
  private lastOutflowM3 = 0;
  private pointerMotion = 0;
  private failed = false;
  private levelPhase: LevelPhase = "playing";

  public constructor(private readonly canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: false,
      stencil: true,
      adaptToDeviceRatio: true,
    });
    this.scene = new Scene(this.engine);
  }

  public async start(): Promise<void> {
    await this.configurePhysics();
    this.createEnvironment();
    this.createPuzzle();
    this.createDrill();
    this.bindInput();

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
    this.scene.clearColor = new Color4(0.025, 0.055, 0.07, 1);
    this.scene.environmentIntensity = 0.75;

    this.camera = new ArcRotateCamera(
      "orbit-camera",
      Math.PI * 1.25,
      Math.PI * 0.34,
      11,
      new Vector3(0, 1.7, 0),
      this.scene,
    );
    this.camera.lowerRadiusLimit = 6;
    this.camera.upperRadiusLimit = 16;
    this.camera.lowerBetaLimit = 0.25;
    this.camera.upperBetaLimit = Math.PI * 0.49;
    this.camera.wheelPrecision = 45;
    this.camera.panningSensibility = 0;
    this.camera.attachControl(this.canvas, true);

    const hemi = new HemisphericLight("ambient", new Vector3(0, 1, 0), this.scene);
    hemi.intensity = 0.8;
    hemi.diffuse = new Color3(0.68, 0.82, 0.88);

    const key = new DirectionalLight("key", new Vector3(-0.5, -1, 0.35), this.scene);
    key.position = new Vector3(5, 10, -6);
    key.intensity = 2.1;

    const floor = MeshBuilder.CreateGround("floor", { width: 12, height: 12 }, this.scene);
    const floorMaterial = new PBRMaterial("floor-material", this.scene);
    floorMaterial.albedoColor = new Color3(0.06, 0.1, 0.105);
    floorMaterial.roughness = 0.28;
    floor.material = floorMaterial;
    new PhysicsAggregate(floor, PhysicsShapeType.BOX, { mass: 0, friction: 0.75 }, this.scene);

    const chamber = MeshBuilder.CreateBox(
      "chamber",
      { width: 7.2, height: 6.4, depth: 7.2 },
      this.scene,
    );
    chamber.position.y = 3.2;
    chamber.material = createGlassMaterial("chamber-glass", this.scene);
    chamber.visibility = 0.22;
    chamber.isPickable = false;
  }

  private createPuzzle(): void {
    const glass = createGlassMaterial("vessel-glass", this.scene);
    const water = createWaterMaterial("water", this.scene);

    const outer = MeshBuilder.CreateCylinder(
      "outer-vessel",
      { diameter: 4.9, height: 1.7, tessellation: 64 },
      this.scene,
    );
    outer.position.y = 1.35;
    outer.material = glass;
    outer.isPickable = false;

    const upper = MeshBuilder.CreateCylinder(
      "upper-vessel",
      { diameter: 3.6, height: 1.25, tessellation: 64 },
      this.scene,
    );
    upper.position.copyFrom(this.targetHostBasePosition);
    upper.material = glass;
    upper.isPickable = false;
    this.targetHost = upper;

    this.upperWaterMesh = MeshBuilder.CreateCylinder(
      "upper-water",
      { diameter: 3.35, height: 1, tessellation: 64 },
      this.scene,
    );
    this.upperWaterMesh.parent = upper;
    this.upperWaterMesh.position.y = -0.25;
    this.upperWaterMesh.material = water;
    this.upperWaterMesh.isPickable = false;

    this.receiverWaterMesh = MeshBuilder.CreateCylinder(
      "receiver-water",
      { diameter: 4.55, height: 1, tessellation: 64 },
      this.scene,
    );
    this.receiverWaterMesh.material = water;
    this.receiverWaterMesh.isPickable = false;

    const inner = MeshBuilder.CreateSphere(
      "inner-vessel",
      { diameter: INNER_RADIUS_SCENE * 2, segments: 32 },
      this.scene,
    );
    inner.position = new Vector3(0.45, 1.75, 0);
    inner.material = glass;
    this.dynamicBody = new PhysicsAggregate(
      inner,
      PhysicsShapeType.SPHERE,
      { mass: 0.22, restitution: 0.08, friction: 0.45 },
      this.scene,
    );

    const innerFluid = MeshBuilder.CreateSphere(
      "inner-fluid",
      { diameter: 0.82, segments: 24 },
      this.scene,
    );
    innerFluid.parent = inner;
    innerFluid.position.y = -0.08;
    innerFluid.scaling.y = 0.62;
    const innerWater = new PBRMaterial("inner-water-material", this.scene);
    innerWater.albedoColor = new Color3(0.03, 0.55, 0.34);
    innerWater.emissiveColor = new Color3(0.01, 0.08, 0.04);
    innerWater.alpha = 0.72;
    innerFluid.material = innerWater;

    this.createBasinCollision();

    for (const targetDefinition of this.level.targets) {
      this.targets.push(new DrillTargetRuntime(this.scene, this.targetHost, targetDefinition));
    }

    this.jetMesh = MeshBuilder.CreateCylinder(
      "pressure-jet",
      { diameter: 0.09, height: 1, tessellation: 16 },
      this.scene,
    );
    this.jetMesh.material = water;
    this.jetMesh.visibility = 0;
    this.flowVisuals = new FlowVisuals(this.scene);
    this.jetMesh.isPickable = false;

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

  private createBasinCollision(): void {
    const basinFloor = MeshBuilder.CreateBox(
      "basin-floor-collider",
      { width: 4.3, depth: 4.3, height: 0.18 },
      this.scene,
    );
    basinFloor.position.y = RECEIVER_BASE_Y - 0.09;
    basinFloor.visibility = 0;
    basinFloor.isPickable = false;
    new PhysicsAggregate(
      basinFloor,
      PhysicsShapeType.BOX,
      { mass: 0, friction: 0.55, restitution: 0.04 },
      this.scene,
    );

    const wallSpecs = [
      { name: "basin-wall-left", position: new Vector3(-2.2, 1.42, 0), size: new Vector3(0.18, 1.55, 4.4) },
      { name: "basin-wall-right", position: new Vector3(2.2, 1.42, 0), size: new Vector3(0.18, 1.55, 4.4) },
      { name: "basin-wall-back", position: new Vector3(0, 1.42, 2.2), size: new Vector3(4.4, 1.55, 0.18) },
      { name: "basin-wall-front", position: new Vector3(0, 1.42, -2.2), size: new Vector3(4.4, 1.55, 0.18) },
    ];

    for (const spec of wallSpecs) {
      const wall = MeshBuilder.CreateBox(
        spec.name,
        { width: spec.size.x, height: spec.size.y, depth: spec.size.z },
        this.scene,
      );
      wall.position.copyFrom(spec.position);
      wall.visibility = 0;
      wall.isPickable = false;
      new PhysicsAggregate(
        wall,
        PhysicsShapeType.BOX,
        { mass: 0, friction: 0.4, restitution: 0.06 },
        this.scene,
      );
    }
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
      if (event.button !== 0 || this.failed || this.levelPhase !== "playing") return;

      const pick = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
      const target = this.targets.find(runtime => runtime.marker === pick?.pickedMesh);
      if (!target || target.holeCreated) return;

      this.activeTarget = target;
      this.targetLocked = true;
      this.drill.press();
    });

    window.addEventListener("pointermove", event => {
      this.pointerMotion = Math.min(
        600,
        this.pointerMotion + Math.hypot(event.movementX, event.movementY) * 7,
      );
    });

    window.addEventListener("pointerup", () => {
      this.targetLocked = false;
      this.drill.release();
      if (this.activeTarget) {
        this.activeTarget.progress01 = Math.max(0, this.activeTarget.progress01 - 0.04);
      }
    });

    window.addEventListener("keydown", event => {
      if (event.key === "1") this.diameterIndex = 0;
      if (event.key === "2") this.diameterIndex = 1;
      if (event.key === "3") this.diameterIndex = 2;
      if (event.key.toLowerCase() === "r") this.resetLevel();
      if (event.key.toLowerCase() === "n") this.nextLevel();
    });
  }

  private simulate(dt: number): void {
    this.updateHostMotion(dt);

    const alignment = this.activeTarget ? this.targetAlignment01(this.activeTarget) : 0;
    const targetAvailable =
      this.activeTarget !== null &&
      !this.activeTarget.holeCreated &&
      !this.failed &&
      alignment >= 0.28;

    this.drill.step(dt, this.targetLocked && targetAvailable);

    const result = this.fluid.step(this.vessel, dt);
    this.lastPressurePa = result.pressurePa;
    this.lastOutflowM3 = result.outflowM3;
    this.receiverVolumeM3 = Math.min(
      this.level.receiverCapacityM3,
      this.receiverVolumeM3 + result.outflowM3,
    );

    this.pointerMotion *= Math.exp(-dt * 7.5);

    if (this.activeTarget && !this.activeTarget.holeCreated) {
      this.simulateActiveTarget(this.activeTarget, alignment, result.pressurePa, dt);
    }

    this.updateTargetVisuals();
    this.applyBuoyancy();
    this.applyJetForce(result.outflowM3);
    this.updateJetVisual(result.outflowM3);
    this.updateFlowVisuals(result.outflowM3, dt);
    this.updateWaterVisuals();

    if (this.levelPhase === "playing") {
      this.levelPhase = evaluateLevel(
        {
          glassFailed: this.failed,
          holeCreated: this.hasPrimaryDrain,
          sourceFill01: this.fluid.getFillRatio(this.vessel),
          receiverFill01: this.receiverFill,
          innerHeightScene: this.dynamicBody.transformNode.getAbsolutePosition().y,
        },
        this.level.goal,
      );
    }
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
      const efficiency = drillingEfficiency(alignment, steadiness);
      target.progress01 +=
        dt *
        0.42 *
        efficiency *
        targetProgressMultiplier(target.definition.effect, this.pressureReliefOpen);

      if (target.progress01 >= 1) {
        const diameter = this.selectedDiameter * target.definition.holeDiameterScale;
        this.fluid.addHole(
          this.vessel,
          diameter,
          target.definition.holeElevationMeters,
        );
        target.holeCreated = true;
        this.latestOpenedTarget = target;
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
    const immersionScene = Math.max(0, this.receiverWaterSurfaceY - sphereBottomY);
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

  private applyJetForce(outflowM3: number): void {
    if (!this.latestOpenedTarget || outflowM3 <= 0) return;

    const bodyPosition = this.dynamicBody.transformNode.getAbsolutePosition();
    const direction = this.targetSurfaceNormal(this.latestOpenedTarget);
    const jet = Math.min(1.35, outflowM3 * 420000);

    this.dynamicBody.body.applyForce(
      direction.scale(jet).add(new Vector3(0, jet * 0.08, 0)),
      bodyPosition,
    );
  }

  private updateJetVisual(outflowM3: number): void {
    const target = this.latestOpenedTarget;
    if (!target || outflowM3 <= 0) {
      this.jetMesh.visibility = 0;
      return;
    }

    const flowMlPerSecond = outflowM3 * 60_000_000;
    const strength = Math.min(1, flowMlPerSecond / 120);
    const length = 0.25 + strength * 1.55;
    const origin = target.marker.getAbsolutePosition();
    const normal = this.targetSurfaceNormal(target);

    this.jetMesh.visibility = 0.25 + strength * 0.75;
    this.jetMesh.scaling.y = length;
    this.jetMesh.position.copyFrom(origin.add(normal.scale(length * 0.5)));
    this.jetMesh.lookAt(origin.add(normal.scale(length + 1)));
    this.jetMesh.rotate(Vector3.Right(), Math.PI / 2);
  }

  private updateFlowVisuals(outflowM3: number, dt: number): void {
    const target = this.latestOpenedTarget;
    if (!target || outflowM3 <= 0) {
      this.flowVisuals.update(dt, 0, null, null);
      return;
    }

    this.flowVisuals.update(
      dt,
      outflowM3,
      target.marker.getAbsolutePosition(),
      this.targetSurfaceNormal(target),
    );
  }

  private updateWaterVisuals(): void {
    const upperFill = this.fluid.getFillRatio(this.vessel);
    const upperHeight = 0.03 + upperFill * 1.02;
    this.upperWaterMesh.scaling.y = upperHeight;
    this.upperWaterMesh.position.y = -0.59 + upperHeight * 0.5;

    const lowerHeight = Math.max(
      0.025,
      this.receiverFill * RECEIVER_WATER_HEIGHT_SCENE,
    );
    this.receiverWaterMesh.scaling.y = lowerHeight;
    this.receiverWaterMesh.position.y = RECEIVER_BASE_Y + lowerHeight * 0.5;
  }

  private nextLevel(): void {
    this.levelIndex = (this.levelIndex + 1) % LEVELS.length;
    this.level = LEVELS[this.levelIndex] ?? LEVELS[0]!;
    this.rebuildTargets();
    this.resetLevel();
  }

  private rebuildTargets(): void {
    for (const target of this.targets) target.dispose();
    this.targets.length = 0;
    for (const definition of this.level.targets) {
      this.targets.push(
        new DrillTargetRuntime(this.scene, this.targetHost, definition),
      );
    }
  }

  private updateHostMotion(dt: number): void {
    this.levelElapsedSeconds += dt;
    const motion = this.level.hostMotion;
    if (!motion) {
      this.targetHost.position.copyFrom(this.targetHostBasePosition);
      return;
    }

    const angle =
      this.levelElapsedSeconds * Math.PI * 2 * motion.frequencyHz +
      motion.phaseRadians;
    const verticalAngle = angle * 1.37 + motion.phaseRadians * 0.5;

    this.targetHost.position.copyFromFloats(
      this.targetHostBasePosition.x +
        Math.sin(angle) * motion.lateralAmplitudeScene,
      this.targetHostBasePosition.y +
        Math.sin(verticalAngle) * motion.verticalAmplitudeScene,
      this.targetHostBasePosition.z,
    );
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
    this.diameterIndex = 1;
    this.targetLocked = false;
    this.activeTarget = null;
    this.latestOpenedTarget = null;
    this.failed = false;
    this.levelPhase = "playing";
    this.lastPressurePa = 0;
    this.lastOutflowM3 = 0;
    this.pointerMotion = 0;
    this.levelElapsedSeconds = 0;
    this.targetHost.position.copyFrom(this.targetHostBasePosition);

    for (const target of this.targets) {
      target.reset();
    }

    this.jetMesh.visibility = 0;
    this.jetMesh.scaling.setAll(1);
    this.flowVisuals.reset();

    this.dynamicBody.transformNode.position.copyFromFloats(0.45, 1.75, 0);
    this.dynamicBody.body.setLinearVelocity(Vector3.Zero());
    this.dynamicBody.body.setAngularVelocity(Vector3.Zero());

    this.updateWaterVisuals();
  }

  private updateTargetVisuals(): void {
    for (const target of this.targets) {
      target.updateVisual(this.failed);
    }
  }

  private failGlass(target: DrillTargetRuntime): void {
    this.failed = true;
    this.levelPhase = "failed";
    this.targetLocked = false;
    this.activeTarget = target;
    this.drill.release();
    target.showFailure();
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
      levelPhase: this.levelPhase,
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
        (this.hasPrimaryDrain ? "Main drain opened" : "Choose target"),
      sourceFill01: this.fluid.getFillRatio(this.vessel),
      receiverFill01: this.receiverFill,
      sourceVolumeM3: this.vessel.volumeM3,
      hydraulicHeadMeters: this.hydraulicHeadMeters,
      innerHeightScene: bodyPosition.y,
      bodySpeedScenePerSecond: bodyVelocity.length(),
    });
  }

  private targetAlignment01(target: DrillTargetRuntime): number {
    return target.alignment01(this.camera.position);
  }

  private targetSurfaceNormal(target: DrillTargetRuntime): Vector3 {
    return target.surfaceNormal(this.camera.position);
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
    return RECEIVER_BASE_Y + this.receiverFill * RECEIVER_WATER_HEIGHT_SCENE;
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

  private get maxTargetStress(): number {
    return this.targets.reduce(
      (max, target) => Math.max(max, target.stress01),
      0,
    );
  }
}
