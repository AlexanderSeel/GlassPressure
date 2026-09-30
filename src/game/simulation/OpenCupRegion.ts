export type CupLocalPoint = {
  x: number;
  y: number;
  z: number;
};

export function isPointInsideOpenCupLocal(
  point: CupLocalPoint,
  innerRadiusScene: number,
  bottomLocalY: number,
  rimLocalY: number,
  radialClearanceScene = 0.1,
  upperMarginScene = 0.62,
  lowerMarginScene = 0.3,
): boolean {
  const usableRadius = Math.max(0, innerRadiusScene - radialClearanceScene);
  const radial = Math.hypot(point.x, point.z);
  return radial < usableRadius &&
    point.y < rimLocalY + upperMarginScene &&
    point.y > bottomLocalY - lowerMarginScene;
}

export function hasEscapedOpenCupLocal(
  point: CupLocalPoint,
  escapeRadiusScene: number,
  bottomLocalY: number,
  lowerMarginScene = 0.35,
): boolean {
  return Math.hypot(point.x, point.z) > Math.max(0, escapeRadiusScene) ||
    point.y < bottomLocalY - lowerMarginScene;
}
