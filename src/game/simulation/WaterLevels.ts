export const SOURCE_MIN_HEIGHT_SCENE = 0.04;
export const SOURCE_MAX_DYNAMIC_HEIGHT_SCENE = 1.68;
export const SOURCE_BASE_LOCAL_Y = -0.86;

export const RECEIVER_MIN_HEIGHT_SCENE = 0.025;
export const RECEIVER_HEIGHT_SCENE = 4.85;

export function clampFill01(fill01: number): number {
  return Math.min(1, Math.max(0, fill01));
}

export function sourceWaterHeightScene(fill01: number): number {
  const fill = clampFill01(fill01);
  return SOURCE_MIN_HEIGHT_SCENE +
    fill * SOURCE_MAX_DYNAMIC_HEIGHT_SCENE;
}

export function sourceSurfaceLocalY(fill01: number): number {
  return SOURCE_BASE_LOCAL_Y + sourceWaterHeightScene(fill01);
}

export function receiverWaterHeightScene(fill01: number): number {
  const fill = clampFill01(fill01);
  return Math.max(
    RECEIVER_MIN_HEIGHT_SCENE,
    fill * RECEIVER_HEIGHT_SCENE,
  );
}

export function receiverSurfaceWorldY(
  baseY: number,
  fill01: number,
): number {
  return baseY + receiverWaterHeightScene(fill01);
}
