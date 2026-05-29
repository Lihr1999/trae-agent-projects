import { PhysicsWorld, RigidBody, Joint, Vector2 } from '../physics/types';
import { vec2 } from '../physics/math';
import { createRigidBody } from '../physics/body';
import { createJoint } from '../physics/constraints';
import { addBody, addJoint, createWorld } from '../physics/world';

export function createRagdollScenario(): PhysicsWorld {
  const world = createWorld(vec2.create(0, 500));

  const ground = createRigidBody(
    { type: 'polygon', vertices: [
      vec2.create(-400, -20), vec2.create(400, -20), vec2.create(400, 20), vec2.create(-400, 20)
    ]},
    vec2.create(400, 550),
    { friction: 0.8, restitution: 0.1, density: 1 },
    true
  );
  ground.color = '#555555';
  addBody(world, ground);

  const leftWall = createRigidBody(
    { type: 'polygon', vertices: [
      vec2.create(-10, -300), vec2.create(10, -300), vec2.create(10, 300), vec2.create(-10, 300)
    ]},
    vec2.create(50, 300),
    { friction: 0.8, restitution: 0.1, density: 1 },
    true
  );
  leftWall.color = '#555555';
  addBody(world, leftWall);

  const rightWall = createRigidBody(
    { type: 'polygon', vertices: [
      vec2.create(-10, -300), vec2.create(10, -300), vec2.create(10, 300), vec2.create(-10, 300)
    ]},
    vec2.create(750, 300),
    { friction: 0.8, restitution: 0.1, density: 1 },
    true
  );
  rightWall.color = '#555555';
  addBody(world, rightWall);

  const startX = 400;
  const startY = 100;

  const head = createRigidBody(
    { type: 'circle', radius: 25 },
    vec2.create(startX, startY),
    { friction: 0.3, restitution: 0.2, density: 1 }
  );
  head.color = '#FFB6C1';
  addBody(world, head);

  const torso = createRigidBody(
    { type: 'polygon', vertices: [
      vec2.create(-25, -40), vec2.create(25, -40), vec2.create(25, 40), vec2.create(-25, 40)
    ]},
    vec2.create(startX, startY + 80),
    { friction: 0.3, restitution: 0.2, density: 1 }
  );
  torso.color = '#87CEEB';
  addBody(world, torso);

  const neckJoint = createJoint(
    'hinge',
    head, torso,
    vec2.create(0, 25),
    vec2.create(0, -40)
  );
  neckJoint.breakingThreshold = 800;
  addJoint(world, neckJoint);

  const leftUpperArm = createRigidBody(
    { type: 'polygon', vertices: [
      vec2.create(-10, -25), vec2.create(10, -25), vec2.create(10, 25), vec2.create(-10, 25)
    ]},
    vec2.create(startX - 50, startY + 50),
    { friction: 0.3, restitution: 0.2, density: 0.8 }
  );
  leftUpperArm.color = '#98FB98';
  addBody(world, leftUpperArm);

  const leftShoulder = createJoint(
    'hinge',
    torso, leftUpperArm,
    vec2.create(-25, -30),
    vec2.create(0, -25)
  );
  leftShoulder.breakingThreshold = 600;
  addJoint(world, leftShoulder);

  const leftLowerArm = createRigidBody(
    { type: 'polygon', vertices: [
      vec2.create(-10, -25), vec2.create(10, -25), vec2.create(10, 25), vec2.create(-10, 25)
    ]},
    vec2.create(startX - 50, startY + 110),
    { friction: 0.3, restitution: 0.2, density: 0.8 }
  );
  leftLowerArm.color = '#98FB98';
  addBody(world, leftLowerArm);

  const leftElbow = createJoint(
    'hinge',
    leftUpperArm, leftLowerArm,
    vec2.create(0, 25),
    vec2.create(0, -25)
  );
  leftElbow.breakingThreshold = 500;
  addJoint(world, leftElbow);

  const rightUpperArm = createRigidBody(
    { type: 'polygon', vertices: [
      vec2.create(-10, -25), vec2.create(10, -25), vec2.create(10, 25), vec2.create(-10, 25)
    ]},
    vec2.create(startX + 50, startY + 50),
    { friction: 0.3, restitution: 0.2, density: 0.8 }
  );
  rightUpperArm.color = '#98FB98';
  addBody(world, rightUpperArm);

  const rightShoulder = createJoint(
    'hinge',
    torso, rightUpperArm,
    vec2.create(25, -30),
    vec2.create(0, -25)
  );
  rightShoulder.breakingThreshold = 600;
  addJoint(world, rightShoulder);

  const rightLowerArm = createRigidBody(
    { type: 'polygon', vertices: [
      vec2.create(-10, -25), vec2.create(10, -25), vec2.create(10, 25), vec2.create(-10, 25)
    ]},
    vec2.create(startX + 50, startY + 110),
    { friction: 0.3, restitution: 0.2, density: 0.8 }
  );
  rightLowerArm.color = '#98FB98';
  addBody(world, rightLowerArm);

  const rightElbow = createJoint(
    'hinge',
    rightUpperArm, rightLowerArm,
    vec2.create(0, 25),
    vec2.create(0, -25)
  );
  rightElbow.breakingThreshold = 500;
  addJoint(world, rightElbow);

  const leftUpperLeg = createRigidBody(
    { type: 'polygon', vertices: [
      vec2.create(-12, -30), vec2.create(12, -30), vec2.create(12, 30), vec2.create(-12, 30)
    ]},
    vec2.create(startX - 20, startY + 150),
    { friction: 0.3, restitution: 0.2, density: 0.9 }
  );
  leftUpperLeg.color = '#DDA0DD';
  addBody(world, leftUpperLeg);

  const leftHip = createJoint(
    'hinge',
    torso, leftUpperLeg,
    vec2.create(-15, 40),
    vec2.create(0, -30)
  );
  leftHip.breakingThreshold = 700;
  addJoint(world, leftHip);

  const leftLowerLeg = createRigidBody(
    { type: 'polygon', vertices: [
      vec2.create(-12, -30), vec2.create(12, -30), vec2.create(12, 30), vec2.create(-12, 30)
    ]},
    vec2.create(startX - 20, startY + 210),
    { friction: 0.3, restitution: 0.2, density: 0.9 }
  );
  leftLowerLeg.color = '#DDA0DD';
  addBody(world, leftLowerLeg);

  const leftKnee = createJoint(
    'hinge',
    leftUpperLeg, leftLowerLeg,
    vec2.create(0, 30),
    vec2.create(0, -30)
  );
  leftKnee.breakingThreshold = 600;
  addJoint(world, leftKnee);

  const rightUpperLeg = createRigidBody(
    { type: 'polygon', vertices: [
      vec2.create(-12, -30), vec2.create(12, -30), vec2.create(12, 30), vec2.create(-12, 30)
    ]},
    vec2.create(startX + 20, startY + 150),
    { friction: 0.3, restitution: 0.2, density: 0.9 }
  );
  rightUpperLeg.color = '#DDA0DD';
  addBody(world, rightUpperLeg);

  const rightHip = createJoint(
    'hinge',
    torso, rightUpperLeg,
    vec2.create(15, 40),
    vec2.create(0, -30)
  );
  rightHip.breakingThreshold = 700;
  addJoint(world, rightHip);

  const rightLowerLeg = createRigidBody(
    { type: 'polygon', vertices: [
      vec2.create(-12, -30), vec2.create(12, -30), vec2.create(12, 30), vec2.create(-12, 30)
    ]},
    vec2.create(startX + 20, startY + 210),
    { friction: 0.3, restitution: 0.2, density: 0.9 }
  );
  rightLowerLeg.color = '#DDA0DD';
  addBody(world, rightLowerLeg);

  const rightKnee = createJoint(
    'hinge',
    rightUpperLeg, rightLowerLeg,
    vec2.create(0, 30),
    vec2.create(0, -30)
  );
  rightKnee.breakingThreshold = 600;
  addJoint(world, rightKnee);

  world.iterations = 8;
  return world;
}

export function createSpringBridgeScenario(): PhysicsWorld {
  const world = createWorld(vec2.create(0, 500));

  const ground = createRigidBody(
    { type: 'polygon', vertices: [
      vec2.create(-400, -20), vec2.create(400, -20), vec2.create(400, 20), vec2.create(-400, 20)
    ]},
    vec2.create(400, 580),
    { friction: 0.8, restitution: 0.1, density: 1 },
    true
  );
  ground.color = '#555555';
  addBody(world, ground);

  const leftAnchor = createRigidBody(
    { type: 'polygon', vertices: [
      vec2.create(-30, -60), vec2.create(30, -60), vec2.create(30, 60), vec2.create(-30, 60)
    ]},
    vec2.create(100, 400),
    { friction: 0.5, restitution: 0.2, density: 1 },
    true
  );
  leftAnchor.color = '#8B4513';
  addBody(world, leftAnchor);

  const rightAnchor = createRigidBody(
    { type: 'polygon', vertices: [
      vec2.create(-30, -60), vec2.create(30, -60), vec2.create(30, 60), vec2.create(-30, 60)
    ]},
    vec2.create(700, 400),
    { friction: 0.5, restitution: 0.2, density: 1 },
    true
  );
  rightAnchor.color = '#8B4513';
  addBody(world, rightAnchor);

  const numLinks = 12;
  const linkWidth = 45;
  const startX = 150;
  const bridgeY = 250;

  let prevBody = leftAnchor;
  let prevX = startX;

  for (let i = 0; i < numLinks; i++) {
    const link = createRigidBody(
      { type: 'polygon', vertices: [
        vec2.create(-linkWidth/2, -8), vec2.create(linkWidth/2, -8), vec2.create(linkWidth/2, 8), vec2.create(-linkWidth/2, 8)
      ]},
      vec2.create(prevX + linkWidth/2, bridgeY + i * 5),
      { friction: 0.3, restitution: 0.1, density: 0.5 }
    );
    link.color = `hsl(${i * 20}, 70%, 60%)`;
    addBody(world, link);

    const springJoint = createJoint(
      'spring',
      prevBody, link,
      i === 0 ? vec2.create(30, -40) : vec2.create(linkWidth/2, 0),
      vec2.create(-linkWidth/2, 0),
      {
        stiffness: 50000,
        damping: 2,
        distance: i === 0 ? 50 : linkWidth,
        breakingThreshold: 2000
      }
    );
    addJoint(world, springJoint);

    const distanceJoint = createJoint(
      'distance',
      prevBody, link,
      i === 0 ? vec2.create(30, -40) : vec2.create(linkWidth/2, 0),
      vec2.create(-linkWidth/2, 0),
      {
        distance: i === 0 ? 50 : linkWidth,
        breakingThreshold: 1500
      }
    );
    addJoint(world, distanceJoint);

    prevBody = link;
    prevX += linkWidth;
  }

  const finalSpring = createJoint(
    'spring',
    prevBody, rightAnchor,
    vec2.create(linkWidth/2, 0),
    vec2.create(-30, -40),
    {
      stiffness: 50000,
      damping: 2,
      distance: 50,
      breakingThreshold: 2000
    }
  );
  addJoint(world, finalSpring);

  const finalDistance = createJoint(
    'distance',
    prevBody, rightAnchor,
    vec2.create(linkWidth/2, 0),
    vec2.create(-30, -40),
    {
      distance: 50,
      breakingThreshold: 1500
    }
  );
  addJoint(world, finalDistance);

  for (let i = 0; i < 5; i++) {
    const weight = createRigidBody(
      { type: 'circle', radius: 15 },
      vec2.create(250 + i * 60, 100),
      { friction: 0.3, restitution: 0.3, density: 2 }
    );
    weight.color = '#FF6347';
    addBody(world, weight);
  }

  world.iterations = 20;
  world.timeStep = 1 / 60;
  return world;
}

export function createSleepingTowerScenario(): PhysicsWorld {
  const world = createWorld(vec2.create(0, 500));

  const ground = createRigidBody(
    { type: 'polygon', vertices: [
      vec2.create(-400, -30), vec2.create(400, -30), vec2.create(400, 30), vec2.create(-400, 30)
    ]},
    vec2.create(400, 570),
    { friction: 0.9, restitution: 0.05, density: 1 },
    true
  );
  ground.color = '#555555';
  addBody(world, ground);

  const numLayers = 10;
  const baseX = 400;
  const baseY = 500;
  const boxSize = 35;

  for (let layer = 0; layer < numLayers; layer++) {
    const boxesInLayer = numLayers - layer;
    const layerWidth = boxesInLayer * boxSize;
    const startX = baseX - layerWidth / 2 + boxSize / 2;

    for (let i = 0; i < boxesInLayer; i++) {
      const box = createRigidBody(
        { type: 'polygon', vertices: [
          vec2.create(-boxSize/2, -boxSize/2),
          vec2.create(boxSize/2, -boxSize/2),
          vec2.create(boxSize/2, boxSize/2),
          vec2.create(-boxSize/2, boxSize/2)
        ]},
        vec2.create(startX + i * boxSize, baseY - layer * boxSize - boxSize/2),
        { friction: 0.7, restitution: 0.05, density: 0.8 }
      );
      box.color = `hsl(${layer * 36}, 60%, 55%)`;
      addBody(world, box);
    }
  }

  const topBall = createRigidBody(
    { type: 'circle', radius: 20 },
    vec2.create(baseX, baseY - numLayers * boxSize - 30),
    { friction: 0.3, restitution: 0.2, density: 1 }
  );
  topBall.color = '#FFD700';
  addBody(world, topBall);

  world.iterations = 15;
  world.sleepingThreshold = 0.05;
  return world;
}

export function createConstraintTearingScenario(): PhysicsWorld {
  const world = createWorld(vec2.create(0, 100));
  world.timeStep = 1 / 200;

  const ground = createRigidBody(
    { type: 'polygon', vertices: [
      vec2.create(-400, -20), vec2.create(400, -20), vec2.create(400, 20), vec2.create(-400, 20)
    ]},
    vec2.create(400, 550),
    { friction: 0.5, restitution: 0.3, density: 1 },
    true
  );
  ground.color = '#555555';
  addBody(world, ground);

  const anchor = createRigidBody(
    { type: 'circle', radius: 30 },
    vec2.create(400, 100),
    { friction: 0.3, restitution: 0.2, density: 1 },
    true
  );
  anchor.color = '#4A4A4A';
  addBody(world, anchor);

  const chainBodies: RigidBody[] = [];
  const numLinks = 20;
  const linkLength = 25;

  for (let i = 0; i < numLinks; i++) {
    const link = createRigidBody(
      { type: 'polygon', vertices: [
        vec2.create(-linkLength/2, -6), vec2.create(linkLength/2, -6), vec2.create(linkLength/2, 6), vec2.create(-linkLength/2, 6)
      ]},
      vec2.create(400, 150 + i * linkLength * 1.5),
      { friction: 0.2, restitution: 0.1, density: 0.6 }
    );
    link.color = `hsl(${i * 15}, 80%, 50%)`;
    addBody(world, link);
    chainBodies.push(link);
  }

  const firstJoint = createJoint(
    'distance',
    anchor, chainBodies[0],
    vec2.create(0, 30),
    vec2.create(0, 0),
    {
      distance: 25,
      breakingThreshold: 50
    }
  );
  addJoint(world, firstJoint);

  for (let i = 0; i < numLinks - 1; i++) {
    const joint = createJoint(
      'distance',
      chainBodies[i], chainBodies[i + 1],
      vec2.create(linkLength/2, 0),
      vec2.create(-linkLength/2, 0),
      {
        distance: linkLength,
        breakingThreshold: 40 + i * 2
      }
    );
    addJoint(world, joint);
  }

  const heavyWeight = createRigidBody(
    { type: 'circle', radius: 35 },
    vec2.create(400, 150 + (numLinks - 1) * linkLength * 1.5 + 60),
    { friction: 0.3, restitution: 0.2, density: 5 }
  );
  heavyWeight.color = '#8B0000';
  addBody(world, heavyWeight);

  const lastJoint = createJoint(
    'distance',
    chainBodies[numLinks - 1], heavyWeight,
    vec2.create(linkLength/2, 0),
    vec2.create(0, 0),
    {
      distance: 40,
      breakingThreshold: 30
    }
  );
  addJoint(world, lastJoint);

  world.iterations = 30;
  return world;
}

export const presets = [
  {
    id: 'ragdoll',
    name: '十五个肢体组成的复杂布娃娃自由落体',
    create: createRagdollScenario
  },
  {
    id: 'spring-bridge',
    name: '高频震荡的刚性弹簧连杆桥',
    create: createSpringBridgeScenario
  },
  {
    id: 'sleeping-tower',
    name: '多物体堆叠形成的休眠塔结构',
    create: createSleepingTowerScenario
  },
  {
    id: 'constraint-tearing',
    name: '极小时间步长下的关节约束撕裂',
    create: createConstraintTearingScenario
  }
];
