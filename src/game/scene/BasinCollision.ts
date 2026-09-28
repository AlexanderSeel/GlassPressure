import {
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
  Scene,
  Vector3,
} from "@babylonjs/core";

export function createBasinCollision(
  scene: Scene,
  baseY: number,
): void {
  const basinFloor = MeshBuilder.CreateBox(
    "basin-floor-collider",
    { width: 4.3, depth: 4.3, height: 0.18 },
    scene,
  );
  basinFloor.position.y = baseY - 0.09;
  basinFloor.visibility = 0;
  basinFloor.isPickable = false;
  new PhysicsAggregate(
    basinFloor,
    PhysicsShapeType.BOX,
    { mass: 0, friction: 0.55, restitution: 0.04 },
    scene,
  );

  const wallSpecs = [
    {
      name: "basin-wall-left",
      position: new Vector3(-2.2, 1.42, 0),
      size: new Vector3(0.18, 1.55, 4.4),
    },
    {
      name: "basin-wall-right",
      position: new Vector3(2.2, 1.42, 0),
      size: new Vector3(0.18, 1.55, 4.4),
    },
    {
      name: "basin-wall-back",
      position: new Vector3(0, 1.42, 2.2),
      size: new Vector3(4.4, 1.55, 0.18),
    },
    {
      name: "basin-wall-front",
      position: new Vector3(0, 1.42, -2.2),
      size: new Vector3(4.4, 1.55, 0.18),
    },
  ];

  for (const spec of wallSpecs) {
    const wall = MeshBuilder.CreateBox(
      spec.name,
      {
        width: spec.size.x,
        height: spec.size.y,
        depth: spec.size.z,
      },
      scene,
    );
    wall.position.copyFrom(spec.position);
    wall.visibility = 0;
    wall.isPickable = false;
    new PhysicsAggregate(
      wall,
      PhysicsShapeType.BOX,
      { mass: 0, friction: 0.4, restitution: 0.06 },
      scene,
    );
  }
}
