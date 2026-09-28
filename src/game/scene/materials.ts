import { Color3, PBRMaterial, Scene } from "@babylonjs/core";

export function createGlassMaterial(
  name: string,
  scene: Scene,
  refractionIntensity = 0.85,
): PBRMaterial {
  const material = new PBRMaterial(name, scene);
  material.albedoColor = new Color3(0.82, 0.95, 1);
  material.metallic = 0;
  material.roughness = 0.08;
  material.alpha = 0.22;
  material.indexOfRefraction = 1.5;
  material.subSurface.isRefractionEnabled = refractionIntensity > 0;
  material.subSurface.refractionIntensity = Math.max(0, refractionIntensity);
  material.subSurface.tintColor = new Color3(0.88, 0.97, 1);
  material.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
  material.backFaceCulling = false;
  return material;
}

export function createWaterMaterial(
  name: string,
  scene: Scene,
): PBRMaterial {
  const material = new PBRMaterial(name, scene);
  material.albedoColor = new Color3(0.02, 0.3, 0.46);
  material.emissiveColor = new Color3(0.005, 0.035, 0.05);
  material.metallic = 0.05;
  material.roughness = 0.17;
  material.alpha = 0.72;
  material.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
  return material;
}
