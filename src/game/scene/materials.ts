import {
  Color3,
  PBRMaterial,
  Scene,
  ShaderMaterial,
  Vector3,
} from "@babylonjs/core";

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
  material.albedoColor = new Color3(0.015, 0.19, 0.28);
  material.emissiveColor = new Color3(0.002, 0.012, 0.018);
  material.metallic = 0.02;
  material.roughness = 0.24;
  material.alpha = 0.2;
  material.indexOfRefraction = 1.333;
  material.subSurface.isRefractionEnabled = true;
  material.subSurface.refractionIntensity = 0.16;
  material.subSurface.tintColor = new Color3(0.05, 0.34, 0.46);
  material.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
  material.backFaceCulling = false;
  return material;
}

export function createWaterSurfaceMaterial(
  name: string,
  scene: Scene,
): ShaderMaterial {
  const vertexSource = `
    precision highp float;

    attribute vec3 position;
    attribute vec3 normal;

    uniform mat4 world;
    uniform mat4 worldViewProjection;
    uniform float time;
    uniform float agitation;

    varying vec3 vWorldPosition;
    varying float vWave;

    void main(void) {
      vec4 worldPosition = world * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      vWave = 0.0;
      gl_Position = worldViewProjection * vec4(position, 1.0);
    }
  `;

  const fragmentSource = `
    precision highp float;

    uniform float time;
    uniform float agitation;
    uniform vec3 cameraPosition;
    uniform vec3 baseColor;

    varying vec3 vWorldPosition;
    varying float vWave;

    void main(void) {
      float a = 0.12 + agitation * 0.22;

      float gx =
        cos(vWorldPosition.x * 4.0 + time * 0.9) * 0.045 +
        sin((vWorldPosition.x + vWorldPosition.z) * 2.6 - time * 0.7) * 0.025;
      float gz =
        sin(vWorldPosition.z * 4.4 - time * 0.8) * 0.04 +
        cos((vWorldPosition.x - vWorldPosition.z) * 2.8 + time * 0.75) * 0.02;

      vec3 normal = normalize(vec3(-gx * a, 1.0, -gz * a));
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      float fresnel = pow(1.0 - clamp(abs(dot(normal, viewDir)), 0.0, 1.0), 3.2);

      vec3 lightDir = normalize(vec3(-0.45, 0.85, -0.25));
      vec3 halfDir = normalize(lightDir + viewDir);
      float specular = pow(max(dot(normal, halfDir), 0.0), 120.0);

      float micro =
        sin(vWorldPosition.x * 15.0 + time * 4.4) *
        cos(vWorldPosition.z * 13.0 - time * 3.7) * 0.5 + 0.5;

      vec3 deep = baseColor * 0.52;
      vec3 shallow = baseColor * 1.22 + vec3(0.02, 0.08, 0.10);
      vec3 color = mix(deep, shallow, 0.42 + fresnel * 0.48);
      color += vec3(specular * (0.12 + agitation * 0.08));
      color += vec3(0.005, 0.012, 0.016) * micro * a;

      float alpha = 0.2 + fresnel * 0.24 + specular * 0.08;
      gl_FragColor = vec4(color, clamp(alpha, 0.18, 0.5));
    }
  `;

  const material = new ShaderMaterial(
    name,
    scene,
    {
      vertexSource,
      fragmentSource,
    },
    {
      attributes: ["position", "normal"],
      uniforms: [
        "world",
        "worldViewProjection",
        "time",
        "agitation",
        "cameraPosition",
        "baseColor",
      ],
      needAlphaBlending: true,
    },
  );

  material.backFaceCulling = false;
  material.setFloat("time", 0);
  material.setFloat("agitation", 0);
  material.setVector3("cameraPosition", Vector3.Zero());
  material.setColor3("baseColor", new Color3(0.018, 0.24, 0.34));
  return material;
}
