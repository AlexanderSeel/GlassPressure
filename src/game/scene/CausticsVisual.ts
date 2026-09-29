import {
  Mesh,
  MeshBuilder,
  Scene,
  ShaderMaterial,
} from "@babylonjs/core";

export class CausticsVisual {
  private readonly mesh: Mesh;
  private readonly material: ShaderMaterial;

  public constructor(scene: Scene) {
    const vertexSource = `
      precision highp float;
      attribute vec3 position;
      uniform mat4 worldViewProjection;
      varying vec2 vUv;

      void main(void) {
        vUv = position.xz * 0.16 + vec2(0.5);
        gl_Position = worldViewProjection * vec4(position, 1.0);
      }
    `;

    const fragmentSource = `
      precision highp float;
      varying vec2 vUv;

      uniform float time;
      uniform float intensity;

      float band(vec2 p, vec2 direction, float frequency, float speed) {
        return sin(dot(p, direction) * frequency + time * speed);
      }

      void main(void) {
        vec2 p = vUv * 2.0 - 1.0;

        float a = band(p, normalize(vec2(1.0, 0.42)), 18.0, 0.75);
        float b = band(p, normalize(vec2(-0.35, 1.0)), 22.0, -0.62);
        float c = band(
          p + vec2(a, b) * 0.035,
          normalize(vec2(0.72, 0.68)),
          27.0,
          0.48
        );

        float pattern = abs(a + b + c) / 3.0;
        pattern = smoothstep(0.56, 0.92, pattern);

        float radial = clamp(1.0 - length(p) * 0.72, 0.0, 1.0);
        float alpha = pattern * radial * intensity * 0.2;

        vec3 color = mix(
          vec3(0.16, 0.48, 0.56),
          vec3(0.56, 0.9, 0.96),
          pattern
        );

        gl_FragColor = vec4(color, alpha);
      }
    `;

    this.material = new ShaderMaterial(
      "water-caustics-material",
      scene,
      { vertexSource, fragmentSource },
      {
        attributes: ["position"],
        uniforms: ["worldViewProjection", "time", "intensity"],
        needAlphaBlending: true,
      },
    );
    this.material.backFaceCulling = false;
    this.material.setFloat("time", 0);
    this.material.setFloat("intensity", 0);

    this.mesh = MeshBuilder.CreateGround(
      "water-caustics",
      {
        width: 6.2,
        height: 6.2,
        subdivisions: 1,
      },
      scene,
    );
    this.mesh.position.y = 0.015;
    this.mesh.material = this.material;
    this.mesh.isPickable = false;
  }

  public update(
    timeSeconds: number,
    waterFill01: number,
  ): void {
    const fill = Math.min(1, Math.max(0, waterFill01));
    this.material.setFloat("time", timeSeconds);
    this.material.setFloat(
      "intensity",
      fill <= 0.02 ? 0 : 0.18 + fill * 0.58,
    );
  }

  public reset(): void {
    this.material.setFloat("intensity", 0);
  }
}
