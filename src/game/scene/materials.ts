import {
  Color3,
  PBRMaterial,
  Scene,
  ShaderMaterial,
  Vector2,
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
    uniform float impactStrength;
    uniform float waveAmplitude;
    uniform vec2 impactPosition;
    uniform vec2 flowDirection;

    varying vec3 vWorldPosition;
    varying vec3 vWorldNormal;
    varying float vWaveHeight;
    varying float vWaveSlope;

    vec2 waveTerm(
      vec2 p,
      vec2 direction,
      float frequency,
      float phase
    ) {
      float x = dot(direction, p) * frequency + phase;
      float s = sin(x);
      float shape = exp(s - 1.0);
      float derivative = shape * cos(x) * frequency;
      return vec2(shape - 0.38, derivative);
    }

    void addWave(
      inout float height,
      inout vec2 gradient,
      vec2 p,
      vec2 direction,
      float frequency,
      float speed,
      float amplitude
    ) {
      vec2 dir = normalize(direction);
      vec2 term = waveTerm(p, dir, frequency, time * speed);
      height += term.x * amplitude;
      gradient += dir * term.y * amplitude;
    }

    void main(void) {
      vec2 p = position.xy;
      float motion = 0.35 + agitation * 0.65;
      float height = 0.0;
      vec2 gradient = vec2(0.0);

      addWave(height, gradient, p, vec2(1.0, 0.18), 2.15, 0.62, 0.44);
      addWave(height, gradient, p, vec2(-0.36, 1.0), 2.85, 0.48, 0.28);
      addWave(height, gradient, p, vec2(0.72, 0.68), 3.65, 0.78, 0.16);
      addWave(height, gradient, p, vec2(-0.88, 0.42), 4.45, 0.93, 0.08);

      vec2 flowDir =
        length(flowDirection) > 0.001
          ? normalize(flowDirection)
          : vec2(1.0, 0.0);
      addWave(height, gradient, p, flowDir, 1.65, 0.42, agitation * 0.14);

      vec2 delta = p - impactPosition;
      float distanceToImpact = length(delta);
      if (distanceToImpact > 0.0001) {
        float ripplePhase = distanceToImpact * 7.5 - time * 4.0;
        float falloff = exp(-distanceToImpact * 1.45);
        float rippleAmplitude = impactStrength * 0.16 * falloff;
        height += sin(ripplePhase) * rippleAmplitude;

        vec2 radial = delta / distanceToImpact;
        float derivative =
          (
            cos(ripplePhase) * 7.5 -
            sin(ripplePhase) * 1.45
          ) *
          rippleAmplitude;
        gradient += radial * derivative;
      }

      float verticalScale = waveAmplitude * motion;
      vec3 displaced = position;
      displaced.z += height * verticalScale;

      vec3 localNormal = normalize(
        vec3(
          -gradient.x * verticalScale,
          -gradient.y * verticalScale,
          1.0
        )
      );

      vec4 worldPosition = world * vec4(displaced, 1.0);
      vWorldPosition = worldPosition.xyz;
      vWorldNormal = normalize(mat3(world) * localNormal);
      vWaveHeight = height;
      vWaveSlope = length(gradient) * verticalScale;

      gl_Position = worldViewProjection * vec4(displaced, 1.0);
    }
  `;

  const fragmentSource = `
    precision highp float;

    uniform vec3 cameraPosition;
    uniform vec3 baseColor;
    uniform float agitation;
    uniform samplerCube environmentMap;

    varying vec3 vWorldPosition;
    varying vec3 vWorldNormal;
    varying float vWaveHeight;
    varying float vWaveSlope;

    void main(void) {
      vec3 normal = normalize(vWorldNormal);
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);

      float viewDot = clamp(dot(normal, viewDir), 0.0, 1.0);
      float fresnel = 0.02 + 0.98 * pow(1.0 - viewDot, 5.0);

      vec3 lightDir = normalize(vec3(-0.42, 0.88, -0.22));
      vec3 halfDir = normalize(lightDir + viewDir);
      float specular = pow(
        max(dot(normal, halfDir), 0.0),
        mix(150.0, 95.0, agitation)
      );

      float waveShade = clamp(vWaveHeight * 0.18 + 0.5, 0.0, 1.0);
      float crest = smoothstep(0.015, 0.085, vWaveSlope);

      vec3 refracted = refract(
        -viewDir,
        normal,
        1.0 / 1.333
      );
      vec3 refractionTint = textureCube(
        environmentMap,
        refracted
      ).rgb;

      float grazing = 1.0 - viewDot;
      float absorption = clamp(
        0.2 + grazing * 0.52 + agitation * 0.08 - crest * 0.05,
        0.0,
        0.82
      );

      vec3 transmitted = mix(
        refractionTint,
        baseColor,
        absorption
      );
      transmitted = mix(
        transmitted * 0.88,
        transmitted * 1.08,
        waveShade
      );

      vec3 reflected = reflect(-viewDir, normal);
      vec3 reflectionTint = textureCube(
        environmentMap,
        reflected
      ).rgb;
      reflectionTint = mix(
        reflectionTint,
        vec3(0.12, 0.2, 0.22),
        0.12
      );

      float movingBand =
        sin(
          vWorldPosition.x * 2.2 +
          vWorldPosition.z * 1.7 +
          reflected.x * 5.0 +
          reflected.z * 4.0
        ) * 0.5 + 0.5;

      vec3 color = mix(
        transmitted,
        reflectionTint,
        clamp(fresnel * 0.9, 0.0, 0.94)
      );
      color += reflectionTint * movingBand * (0.018 + agitation * 0.02);
      color += reflectionTint * crest * (0.035 + agitation * 0.025);
      color += vec3(specular * (0.22 + agitation * 0.1 + crest * 0.08));

      float alpha =
        0.16 +
        fresnel * 0.38 +
        absorption * 0.08 +
        crest * 0.055 +
        specular * 0.05;

      gl_FragColor = vec4(
        color,
        clamp(alpha, 0.18, 0.56)
      );
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
        "impactStrength",
        "waveAmplitude",
        "impactPosition",
        "flowDirection",
        "cameraPosition",
        "baseColor",
      ],
      samplers: ["environmentMap"],
      needAlphaBlending: true,
    },
  );

  material.backFaceCulling = false;
  material.setFloat("time", 0);
  material.setFloat("agitation", 0);
  material.setFloat("impactStrength", 0);
  material.setFloat("waveAmplitude", 0.03);
  material.setVector2("impactPosition", Vector2.Zero());
  material.setVector2("flowDirection", Vector2.Zero());
  material.setVector3("cameraPosition", Vector3.Zero());
  material.setColor3("baseColor", new Color3(0.025, 0.27, 0.36));
  if (scene.environmentTexture) {
    material.setTexture("environmentMap", scene.environmentTexture);
  }
  return material;
}
