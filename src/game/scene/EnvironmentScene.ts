import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  HemisphericLight,
  MeshBuilder,
  PBRMaterial,
  PhysicsAggregate,
  PhysicsShapeType,
  Scene,
  Vector3,
} from "@babylonjs/core";
import type { QualityPreset } from "../quality/QualitySettings";
import { createGlassMaterial } from "./materials";

export function createEnvironmentScene(
  scene: Scene,
  canvas: HTMLCanvasElement,
  quality: QualityPreset,
): ArcRotateCamera {
  scene.clearColor = new Color4(0.025, 0.055, 0.07, 1);
  scene.environmentIntensity = 0.75;

  const camera = new ArcRotateCamera(
    "orbit-camera",
    Math.PI * 1.25,
    Math.PI * 0.34,
    11,
    new Vector3(0, 1.7, 0),
    scene,
  );
  camera.lowerRadiusLimit = 6;
  camera.upperRadiusLimit = 16;
  camera.lowerBetaLimit = 0.25;
  camera.upperBetaLimit = Math.PI * 0.49;
  camera.wheelPrecision = 45;
  camera.panningSensibility = 0;
  camera.attachControl(canvas, true);

  const hemi = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.8;
  hemi.diffuse = new Color3(0.68, 0.82, 0.88);

  const key = new DirectionalLight(
    "key",
    new Vector3(-0.5, -1, 0.35),
    scene,
  );
  key.position = new Vector3(5, 10, -6);
  key.intensity = 2.1;

  const floor = MeshBuilder.CreateGround(
    "floor",
    { width: 12, height: 12 },
    scene,
  );
  const floorMaterial = new PBRMaterial("floor-material", scene);
  floorMaterial.albedoColor = new Color3(0.06, 0.1, 0.105);
  floorMaterial.roughness = 0.28;
  floor.material = floorMaterial;
  new PhysicsAggregate(
    floor,
    PhysicsShapeType.BOX,
    { mass: 0, friction: 0.75 },
    scene,
  );

  const chamber = MeshBuilder.CreateBox(
    "chamber",
    { width: 7.2, height: 6.4, depth: 7.2 },
    scene,
  );
  chamber.position.y = 3.2;
  chamber.material = createGlassMaterial(
    "chamber-glass",
    scene,
    quality.glassRefractionIntensity,
  );
  chamber.visibility = 0.22;
  chamber.isPickable = false;

  return camera;
}
