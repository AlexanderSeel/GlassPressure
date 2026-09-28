import {
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
  Scene,
  Vector3,
} from "@babylonjs/core";

const BASIN_INNER_RADIUS = 2.27;
const WALL_HEIGHT = 1.72;
const WALL_THICKNESS = 0.16;
const WALL_SEGMENTS = 16;

export function createBasinCollision(
  scene: Scene,
  baseY: number,
): void {
  const basinFloor = MeshBuilder.CreateCylinder(
    "basin-floor-collider",
    {
      diameter: BASIN_INNER_RADIUS * 2,
      height: 0.18,
      tessellation: 48,
    },
    scene,
  );
  basinFloor.position.y = baseY - 0.09;
  basinFloor.visibility = 0;
  basinFloor.isPickable = false;
  new PhysicsAggregate(
    basinFloor,
    PhysicsShapeType.CYLINDER,
    { mass: 0, friction: 0.55, restitution: 0.04 },
    scene,
  );

  const circumference = Math.PI * BASIN_INNER_RADIUS * 2;
  const segmentWidth = circumference / WALL_SEGMENTS * 1.08;
  const wallCenterY = baseY + WALL_HEIGHT * 0.5;

  for (let i = 0; i < WALL_SEGMENTS; i += 1) {
    const angle = (i / WALL_SEGMENTS) * Math.PI * 2;
    const wall = MeshBuilder.CreateBox(
      `basin-wall-${i}`,
      {
        width: segmentWidth,
        height: WALL_HEIGHT,
        depth: WALL_THICKNESS,
      },
      scene,
    );

    wall.position = new Vector3(
      Math.sin(angle) * BASIN_INNER_RADIUS,
      wallCenterY,
      Math.cos(angle) * BASIN_INNER_RADIUS,
    );
    wall.rotation.y = angle;
    wall.visibility = 0;
    wall.isPickable = false;

    new PhysicsAggregate(
      wall,
      PhysicsShapeType.BOX,
      {
        mass: 0,
        friction: 0.32,
        restitution: 0.08,
      },
      scene,
    );
  }
}
