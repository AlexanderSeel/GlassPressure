import {
  PhysicsBody,
  PhysicsMotionType,
  PhysicsShapeBox,
  PhysicsShapeContainer,
  PhysicsShapeCylinder,
  Quaternion,
  Scene,
  TransformNode,
  Vector3,
} from "@babylonjs/core";

export type DynamicOpenCupBody = {
  body: PhysicsBody;
  transformNode: TransformNode;
  dispose: () => void;
};

export type OpenCupBodyOptions = {
  innerRadius: number;
  height: number;
  wallThickness: number;
  bottomThickness: number;
  wallSegments: number;
  massKg: number;
};

export function createDynamicOpenCupBody(
  scene: Scene,
  transformNode: TransformNode,
  options: OpenCupBodyOptions,
): DynamicOpenCupBody {
  const body = new PhysicsBody(
    transformNode,
    PhysicsMotionType.DYNAMIC,
    false,
    scene,
  );

  const container = new PhysicsShapeContainer(scene);
  const childShapes: Array<
    PhysicsShapeBox | PhysicsShapeCylinder
  > = [];

  const bottomY = -options.height * 0.5;
  const bottom = new PhysicsShapeCylinder(
    new Vector3(0, bottomY, 0),
    new Vector3(
      0,
      bottomY + options.bottomThickness,
      0,
    ),
    Math.max(0.05, options.innerRadius * 0.93),
    scene,
  );
  container.addChild(bottom);
  childShapes.push(bottom);

  const circumference = Math.PI * 2 * options.innerRadius;
  const segmentWidth =
    (circumference / options.wallSegments) * 1.06;
  const wallCenterY =
    -options.height * 0.5 + options.height * 0.5;

  for (
    let segment = 0;
    segment < options.wallSegments;
    segment += 1
  ) {
    const angle =
      (segment / options.wallSegments) * Math.PI * 2;

    const center = new Vector3(
      Math.sin(angle) *
        (options.innerRadius + options.wallThickness * 0.45),
      wallCenterY,
      Math.cos(angle) *
        (options.innerRadius + options.wallThickness * 0.45),
    );

    const rotation = Quaternion.RotationYawPitchRoll(
      angle,
      0,
      0,
    );

    const wall = new PhysicsShapeBox(
      center,
      rotation,
      new Vector3(
        segmentWidth,
        options.height,
        options.wallThickness,
      ),
      scene,
    );
    container.addChild(wall);
    childShapes.push(wall);
  }

  body.shape = container;
  body.setMassProperties({ mass: options.massKg });

  return {
    body,
    transformNode,
    dispose: () => {
      body.dispose();
      for (const shape of childShapes) shape.dispose();
      container.dispose();
    },
  };
}
