import {
  Mesh,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
  Scene,
  Vector3,
} from "@babylonjs/core";

export type CupCollision = {
  meshes: Mesh[];
  aggregates: PhysicsAggregate[];
  innerRadius: number;
  bottomY: number;
  rimY: number;
};

export function createOpenCupCollision(
  scene: Scene,
  name: string,
  center: Vector3,
  innerRadius: number,
  height: number,
  wallSegments = 14,
): CupCollision {
  const meshes: Mesh[] = [];
  const aggregates: PhysicsAggregate[] = [];
  const thickness = 0.1;
  const bottomThickness = 0.12;
  const bottomY = center.y - height * 0.5;
  const rimY = center.y + height * 0.5;
  // Keep the collision wall slightly below the visible rim. A dynamic
  // vessel should roll/float across the rim instead of balancing forever
  // on the flat top face of a box-segment collider.
  const collisionWallHeight = Math.max(0.3, height - 0.3);
  const collisionWallCenterY = bottomY + collisionWallHeight * 0.5;

  const floor = MeshBuilder.CreateCylinder(
    `${name}-floor`,
    {
      diameter: innerRadius * 2,
      height: bottomThickness,
      tessellation: 40,
    },
    scene,
  );
  floor.position.copyFromFloats(center.x, bottomY, center.z);
  floor.visibility = 0;
  floor.isPickable = false;
  meshes.push(floor);
  aggregates.push(
    new PhysicsAggregate(
      floor,
      PhysicsShapeType.CYLINDER,
      { mass: 0, friction: 0.36, restitution: 0.05 },
      scene,
    ),
  );

  const circumference = Math.PI * innerRadius * 2;
  const segmentWidth = (circumference / wallSegments) * 1.08;

  for (let i = 0; i < wallSegments; i += 1) {
    const angle = (i / wallSegments) * Math.PI * 2;
    const wall = MeshBuilder.CreateBox(
      `${name}-wall-${i}`,
      {
        width: segmentWidth,
        height: collisionWallHeight,
        depth: thickness,
      },
      scene,
    );

    wall.position.copyFromFloats(
      center.x + Math.sin(angle) * innerRadius,
      collisionWallCenterY,
      center.z + Math.cos(angle) * innerRadius,
    );
    wall.rotation.y = angle;
    wall.visibility = 0;
    wall.isPickable = false;
    meshes.push(wall);

    aggregates.push(
      new PhysicsAggregate(
        wall,
        PhysicsShapeType.BOX,
        { mass: 0, friction: 0.28, restitution: 0.06 },
        scene,
      ),
    );
  }

  return {
    meshes,
    aggregates,
    innerRadius,
    bottomY,
    rimY,
  };
}
