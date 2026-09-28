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
      vec3 displaced = position;
      float a = 0.25 + agitation * 0.75;
      float waveA = sin(position.x * 5.3 + time * 2.2);
      float waveB = cos(position.y * 6.1 - time * 1.75);
      float waveC = sin((position.x + position.y) * 3.4 + time * 2.8);
      float wave = (waveA * 0.46 + waveB * 0.34 + waveC * 0.20) * a;

      displaced.z += wave * 0.018;
      vec4 worldPosition = world * vec4(displaced, 1.0);
      vWorldPosition = worldPosition.xyz;
      vWave = wave;
      gl_Position = worldViewProjection * vec4(displaced, 1.0);
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
      float a = 0.25 + agitation * 0.75;

      float gx =
        cos(vWorldPosition.x * 7.0 + time * 2.4) * 0.16 +
        sin((vWorldPosition.x + vWorldPosition.z) * 4.0 - time * 1.7) * 0.09;
      float gz =
        sin(vWorldPosition.z * 8.0 - time * 2.0) * 0.15 +
        cos((vWorldPosition.x - vWorldPosition.z) * 4.7 + time * 1.9) * 0.08;

      vec3 normal = normalize(vec3(-gx * a, 1.0, -gz * a));
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      float fresnel = pow(1.0 - clamp(abs(dot(normal, viewDir)), 0.0, 1.0), 3.2);

      vec3 lightDir = normalize(vec3(-0.45, 0.85, -0.25));
      vec3 halfDir = normalize(lightDir + viewDir);
      float specular = pow(max(dot(normal, halfDir), 0.0), 88.0);

      float micro =
        sin(vWorldPosition.x * 15.0 + time * 4.4) *
        cos(vWorldPosition.z * 13.0 - time * 3.7) * 0.5 + 0.5;

      vec3 deep = baseColor * 0.52;
      vec3 shallow = baseColor * 1.22 + vec3(0.02, 0.08, 0.10);
      vec3 color = mix(deep, shallow, 0.42 + fresnel * 0.48);
      color += vec3(specular * (0.45 + agitation * 0.45));
      color += vec3(0.015, 0.035, 0.045) * micro * a;

      float alpha = 0.48 + fresnel * 0.32 + specular * 0.12;
      gl_FragColor = vec4(color, clamp(alpha, 0.38, 0.88));
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
  material.setColor3("baseColor", new Color3(0.035, 0.43, 0.58));
  return material;
}
