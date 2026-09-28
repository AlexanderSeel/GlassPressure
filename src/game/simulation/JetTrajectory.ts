import { Vector3 } from "@babylonjs/core";

export type JetImpact = {
  position: Vector3;
  timeSeconds: number;
};

export function predictJetImpact(
  origin: Vector3,
  direction: Vector3,
  speedScenePerSecond: number,
  receiverSurfaceY: number,
  gravityScenePerSecond2 = 0.55,
  maxTimeSeconds = 3,
): JetImpact | null {
  const speed = Math.max(0, speedScenePerSecond);
  if (speed <= 0) return null;

  const normal =
    direction.lengthSquared() > 0.000001
      ? direction.normalize()
      : new Vector3(0, 0, -1);
  const velocity = normal.scale(speed);
  const gravity = Math.max(0, gravityScenePerSecond2);
  const deltaY = receiverSurfaceY - origin.y;

  let time: number | null = null;

  if (gravity <= 0.000001) {
    if (Math.abs(velocity.y) <= 0.000001) return null;
    const candidate = deltaY / velocity.y;
    if (candidate > 0) time = candidate;
  } else {
    const discriminant =
      velocity.y * velocity.y - 2 * gravity * deltaY;
    if (discriminant < 0) return null;

    const root = Math.sqrt(discriminant);
    const a = (velocity.y - root) / gravity;
    const b = (velocity.y + root) / gravity;
    const positive = [a, b]
      .filter(candidate => candidate > 0.0001)
      .sort((left, right) => left - right);
    time = positive[0] ?? null;
  }

  if (time === null || time > maxTimeSeconds) return null;

  return {
    timeSeconds: time,
    position: new Vector3(
      origin.x + velocity.x * time,
      receiverSurfaceY,
      origin.z + velocity.z * time,
    ),
  };
}
