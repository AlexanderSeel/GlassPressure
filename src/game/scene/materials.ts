import{Color3,PBRMaterial,Scene}from"@babylonjs/core";

export function createGlassMaterial(name:string,scene:Scene):PBRMaterial{
  const material=new PBRMaterial(name,scene);
  material.albedoColor=new Color3(.82,.95,1);material.metallic=0;material.roughness=.08;material.alpha=.22;material.indexOfRefraction=1.5;
  material.subSurface.isRefractionEnabled=true;material.subSurface.refractionIntensity=.85;material.subSurface.tintColor=new Color3(.88,.97,1);
  material.transparencyMode=PBRMaterial.PBRMATERIAL_ALPHABLEND;material.backFaceCulling=false;return material;
}
export function createWaterMaterial(name:string,scene:Scene):PBRMaterial{
  const material=new PBRMaterial(name,scene);
  material.albedoColor=new Color3(.02,.3,.46);material.emissiveColor=new Color3(.005,.035,.05);material.metallic=.05;material.roughness=.17;material.alpha=.72;
  material.transparencyMode=PBRMaterial.PBRMATERIAL_ALPHABLEND;return material;
}
