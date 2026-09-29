import {
  ArcRotateCamera,
  Color3,
  Color4,
  CubeTexture,
  DirectionalLight,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  PhysicsAggregate,
  PhysicsShapeType,
  Scene,
  StandardMaterial,
  Texture,
  Vector3,
} from "@babylonjs/core";
import type { QualityPreset } from "../quality/QualitySettings";
import { createGlassMaterial } from "./materials";

export type EnvironmentId =
  | "botanical-atrium"
  | "dark-laboratory"
  | "ocean-observatory"
  | "desert-station"
  | "neon-night-lab"
  | "white-gallery";

type EnvironmentProfile = {
  cubeRoot: string;
  clearColor: Color4;
  floorColor: Color3;
  ambientColor: Color3;
  ambientIntensity: number;
  keyIntensity: number;
  environmentIntensity: number;
};

const BABYLON_CUBES = "https://playground.babylonjs.com/textures/";

const PROFILES: Record<EnvironmentId, EnvironmentProfile> = {
  "botanical-atrium": {
    cubeRoot: `${BABYLON_CUBES}TropicalSunnyDay`,
    clearColor: new Color4(0.035, 0.07, 0.055, 1),
    floorColor: new Color3(0.055, 0.105, 0.075),
    ambientColor: new Color3(0.74, 0.88, 0.74),
    ambientIntensity: 0.95,
    keyIntensity: 2.25,
    environmentIntensity: 0.9,
  },
  "dark-laboratory": {
    cubeRoot: `${BABYLON_CUBES}skybox3`,
    clearColor: new Color4(0.018, 0.028, 0.035, 1),
    floorColor: new Color3(0.035, 0.045, 0.055),
    ambientColor: new Color3(0.42, 0.55, 0.62),
    ambientIntensity: 0.58,
    keyIntensity: 1.65,
    environmentIntensity: 0.72,
  },
  "ocean-observatory": {
    cubeRoot: `${BABYLON_CUBES}skybox2`,
    clearColor: new Color4(0.015, 0.05, 0.07, 1),
    floorColor: new Color3(0.025, 0.075, 0.085),
    ambientColor: new Color3(0.48, 0.72, 0.82),
    ambientIntensity: 0.82,
    keyIntensity: 1.85,
    environmentIntensity: 0.88,
  },
  "desert-station": {
    cubeRoot: `${BABYLON_CUBES}skybox4`,
    clearColor: new Color4(0.09, 0.065, 0.045, 1),
    floorColor: new Color3(0.14, 0.095, 0.06),
    ambientColor: new Color3(0.95, 0.76, 0.58),
    ambientIntensity: 0.86,
    keyIntensity: 2.4,
    environmentIntensity: 0.92,
  },
  "neon-night-lab": {
    cubeRoot: `${BABYLON_CUBES}space`,
    clearColor: new Color4(0.012, 0.012, 0.028, 1),
    floorColor: new Color3(0.035, 0.025, 0.065),
    ambientColor: new Color3(0.36, 0.42, 0.75),
    ambientIntensity: 0.64,
    keyIntensity: 1.45,
    environmentIntensity: 0.8,
  },
  "white-gallery": {
    cubeRoot: `${BABYLON_CUBES}skybox`,
    clearColor: new Color4(0.12, 0.135, 0.14, 1),
    floorColor: new Color3(0.3, 0.31, 0.315),
    ambientColor: new Color3(0.92, 0.94, 0.95),
    ambientIntensity: 1.08,
    keyIntensity: 2.0,
    environmentIntensity: 0.78,
  },
};

export type EnvironmentSceneController = {
  camera: ArcRotateCamera;
  applyEnvironment: (environmentId: EnvironmentId) => CubeTexture;
  getEnvironmentTexture: () => CubeTexture;
};

export function createEnvironmentScene(
  scene: Scene,
  canvas: HTMLCanvasElement,
  quality: QualityPreset,
  initialEnvironment: EnvironmentId,
): EnvironmentSceneController {
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

  const hemi = new HemisphericLight(
    "ambient",
    new Vector3(0, 1, 0),
    scene,
  );

  const key = new DirectionalLight(
    "key",
    new Vector3(-0.5, -1, 0.35),
    scene,
  );
  key.position = new Vector3(5, 10, -6);

  const floor = MeshBuilder.CreateGround(
    "floor",
    { width: 12, height: 12 },
    scene,
  );
  const floorMaterial = new PBRMaterial("floor-material", scene);
  floorMaterial.roughness = 0.3;
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
  chamber.visibility = 0.16;
  chamber.isPickable = false;

  const skybox = MeshBuilder.CreateBox(
    "environment-skybox",
    { size: 90 },
    scene,
  );
  skybox.infiniteDistance = true;
  skybox.isPickable = false;

  const skyboxMaterial = new StandardMaterial(
    "environment-skybox-material",
    scene,
  );
  skyboxMaterial.backFaceCulling = false;
  skyboxMaterial.disableLighting = true;
  skyboxMaterial.diffuseColor = Color3.Black();
  skyboxMaterial.specularColor = Color3.Black();
  skybox.material = skyboxMaterial;

  let currentTexture = new CubeTexture(
    PROFILES[initialEnvironment].cubeRoot,
    scene,
  );

  const applyEnvironment = (
    environmentId: EnvironmentId,
  ): CubeTexture => {
    const profile = PROFILES[environmentId];
    const nextTexture = new CubeTexture(profile.cubeRoot, scene);
    nextTexture.coordinatesMode = Texture.SKYBOX_MODE;

    const previous = currentTexture;
    currentTexture = nextTexture;

    skyboxMaterial.reflectionTexture = nextTexture;
    scene.environmentTexture = nextTexture;
    scene.environmentIntensity = profile.environmentIntensity;
    scene.clearColor = profile.clearColor;

    floorMaterial.albedoColor = profile.floorColor;
    hemi.diffuse = profile.ambientColor;
    hemi.intensity = profile.ambientIntensity;
    key.intensity = profile.keyIntensity;

    if (previous !== nextTexture) {
      queueMicrotask(() => previous.dispose());
    }

    return nextTexture;
  };

  applyEnvironment(initialEnvironment);

  return {
    camera,
    applyEnvironment,
    getEnvironmentTexture: () => currentTexture,
  };
}
